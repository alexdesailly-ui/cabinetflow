-- Relève — données sensibles, droits RGPD, rétention.
-- Commun aux scénarios A et B de DONNEES_SANTE.md :
--   * chiffrement au repos de la fiche de passation (pgcrypto, clé hors base) ;
--   * accès uniquement par RPC, contrôlé (fenêtre J-7 → J+3) et journalisé ;
--   * export et suppression de compte ;
--   * purge automatique selon la politique de rétention.
-- Le basculement A → B est UN paramètre : private.parametres.fiche_patients_autorises.

/* ------------------------------------------------------------------ */
/* Paramètres de plateforme                                            */
/* ------------------------------------------------------------------ */

create table if not exists private.parametres (
  cle text primary key,
  valeur jsonb not null
);
insert into private.parametres (cle, valeur) values
  -- Scénario A (recommandé) : aucune liste de patients côté serveur tant que l'hébergement n'est pas HDS.
  ('fiche_patients_autorises', 'false'),
  ('retention_fiche_jours', '90'),
  ('retention_audit_jours', '365')
on conflict (cle) do nothing;

create or replace function private.parametre(c text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select valeur from private.parametres where cle = c
$$;

/** Ce que l'interface a besoin de savoir pour s'adapter (aucun secret). */
create or replace function public.parametres_publics() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('fichePatientsAutorises', coalesce(private.parametre('fiche_patients_autorises'), 'false'))
$$;
revoke all on function public.parametres_publics() from public;
grant execute on function public.parametres_publics() to anon, authenticated;

/* ------------------------------------------------------------------ */
/* Clé de chiffrement : Supabase Vault en prod, réglage de base en test */
/* ------------------------------------------------------------------ */

create or replace function private.cle_donnees() returns text
language plpgsql stable security definer set search_path = '' as $$
declare k text;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into k using 'releve_cle_donnees';
  end if;
  k := coalesce(k, current_setting('app.cle_donnees', true));
  if k is null or length(k) < 32 then
    raise exception 'Clé de chiffrement absente ou trop courte (secret Vault « releve_cle_donnees »)';
  end if;
  return k;
end $$;
revoke all on function private.cle_donnees() from public, authenticated;

create or replace function private.chiffrer(v jsonb) returns bytea
language sql volatile security definer set search_path = '' as $$
  select extensions.pgp_sym_encrypt(v::text, private.cle_donnees(), 'cipher-algo=aes256')
$$;
create or replace function private.dechiffrer(b bytea) returns jsonb
language sql stable security definer set search_path = '' as $$
  select extensions.pgp_sym_decrypt(b, private.cle_donnees())::jsonb
$$;
revoke all on function private.chiffrer(jsonb) from public, authenticated;
revoke all on function private.dechiffrer(bytea) from public, authenticated;

/* ------------------------------------------------------------------ */
/* Fiche de passation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Accès à la fiche : le cabinet de la mission, toujours ; le remplaçant retenu,
 * contrat signé des deux côtés, de J-7 avant le début à J+3 après la fin.
 */
create or replace function private.peut_lire_fiche(mission uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.est_cabinet_de_mission(mission) or exists (
    select 1 from public.missions m join public.contrats k on k.mission_id = m.id
    where m.id = mission
      and k.remplacant_id in (select private.mes_comptes())
      and k.signature_titulaire is not null and k.signature_remplacant is not null
      and current_date between m.du - 7 and m.au + 3
  )
$$;

create or replace function private.valider_fiche(contenu jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare p jsonb;
begin
  if jsonb_typeof(contenu) <> 'object' then raise exception 'Fiche invalide' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(contenu -> 'patients', '[]')) <> 'array' or jsonb_array_length(coalesce(contenu -> 'patients', '[]')) > 200 then
    raise exception 'Liste de patients invalide (200 au maximum)' using errcode = '22023';
  end if;
  for p in select * from jsonb_array_elements(coalesce(contenu -> 'patients', '[]')) loop
    -- Des initiales, jamais un nom : on refuse tout ce qui ressemble à un nom complet.
    if char_length(coalesce(p ->> 'initiales', '')) > 12 then
      raise exception 'Initiales trop longues : jamais de nom complet' using errcode = '22023';
    end if;
    if char_length(p::text) > 1500 then raise exception 'Ligne patient trop longue' using errcode = '22023'; end if;
  end loop;
  if char_length(contenu::text) > 100000 then raise exception 'Fiche trop volumineuse' using errcode = '22023'; end if;
end $$;

create or replace function public.fiche_enregistrer(mission uuid, contenu jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  nb int := jsonb_array_length(coalesce(contenu -> 'patients', '[]'));
  cabinet uuid;
begin
  if not private.est_cabinet_de_mission(mission) then
    raise exception 'Seul le cabinet de la mission prépare la fiche' using errcode = '42501';
  end if;
  perform private.quota('fiche_ecriture:' || auth.uid(), 60, 3600);
  perform private.valider_fiche(contenu);
  if nb > 0 and not coalesce((private.parametre('fiche_patients_autorises'))::boolean, false) then
    raise exception 'Liste de patients désactivée : hébergement non certifié HDS (voir DONNEES_SANTE.md)' using errcode = '42501';
  end if;
  insert into public.fiches_tournee (mission_id, contenu_chiffre, nb_patients, maj_le, maj_par)
  values (mission, private.chiffrer(contenu - 'missionId' - 'majLe'), nb, now(), auth.uid())
  on conflict (mission_id) do update
    set contenu_chiffre = excluded.contenu_chiffre, nb_patients = excluded.nb_patients, maj_le = now(), maj_par = auth.uid();
  select cabinet_id into cabinet from public.missions where id = mission;
  perform private.journaliser('ecriture', 'fiches_tournee', mission::text, cabinet, jsonb_build_object('nb_patients', nb));
end $$;

create or replace function public.fiche_lire(mission uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f public.fiches_tournee;
  cabinet uuid;
begin
  if not private.peut_lire_fiche(mission) then return null; end if;
  perform private.quota('fiche_lecture:' || auth.uid(), 300, 3600);
  select * into f from public.fiches_tournee where mission_id = mission;
  if f.mission_id is null then return null; end if;
  select cabinet_id into cabinet from public.missions where id = mission;
  perform private.journaliser('lecture', 'fiches_tournee', mission::text, cabinet);
  return private.dechiffrer(f.contenu_chiffre) || jsonb_build_object('missionId', f.mission_id, 'majLe', f.maj_le);
end $$;

/** Toutes les fiches lisibles par l'utilisateur (chargement initial), chaque lecture journalisée. */
create or replace function public.fiches_visibles() returns setof jsonb
language plpgsql security definer set search_path = '' as $$
declare m uuid;
begin
  for m in select f.mission_id from public.fiches_tournee f loop
    if private.peut_lire_fiche(m) then
      return next public.fiche_lire(m);
    end if;
  end loop;
end $$;

revoke all on function public.fiche_enregistrer(uuid, jsonb) from public, anon;
revoke all on function public.fiche_lire(uuid) from public, anon;
revoke all on function public.fiches_visibles() from public, anon;
grant execute on function public.fiche_enregistrer(uuid, jsonb) to authenticated;
grant execute on function public.fiche_lire(uuid) to authenticated;
grant execute on function public.fiches_visibles() to authenticated;

/* ------------------------------------------------------------------ */
/* Droits RGPD : accès / portabilité, effacement                       */
/* ------------------------------------------------------------------ */

create or replace function public.rgpd_export() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  ids uuid[];
  resultat jsonb;
begin
  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform private.quota('rgpd_export:' || uid, 5, 86400);
  select coalesce(array_agg(compte_id), '{}') into ids from public.compte_membres where user_id = uid;
  resultat := jsonb_build_object(
    'genere_le', now(),
    'utilisateur', (select jsonb_build_object('id', u.id, 'email', u.email, 'cree_le', u.created_at) from auth.users u where u.id = uid),
    'comptes', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.comptes c where c.id = any (ids)),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from public.pieces p where p.compte_id = any (ids)),
    'missions', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.missions m where m.cabinet_id = any (ids) or m.remplacant_retenu_id = any (ids)),
    'candidatures', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.candidatures c where c.remplacant_id = any (ids)),
    'contrats', (select coalesce(jsonb_agg(to_jsonb(k)), '[]') from public.contrats k where k.cabinet_id = any (ids) or k.remplacant_id = any (ids)),
    'lignes_retrocession', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.lignes_retrocession l
      join public.contrats k on k.id = l.contrat_id where k.cabinet_id = any (ids) or k.remplacant_id = any (ids)),
    'recommandations', (select coalesce(jsonb_agg(to_jsonb(r)), '[]') from public.recommandations r where r.de_id = any (ids) or r.vers_id = any (ids)),
    'invitations', (select coalesce(jsonb_agg(to_jsonb(i)), '[]') from public.invitations i where i.par_id = any (ids) or i.filleul_id = any (ids)),
    'badges', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from public.badges b where b.compte_id = any (ids)),
    'abonnement', (select coalesce(jsonb_agg(to_jsonb(s) - 'stripe_customer_id' - 'stripe_subscription_id'), '[]') from public.subscriptions s where s.cabinet_id = any (ids)),
    'fiches_tournee', (select coalesce(jsonb_agg(private.dechiffrer(f.contenu_chiffre) || jsonb_build_object('missionId', f.mission_id)), '[]')
      from public.fiches_tournee f join public.missions m on m.id = f.mission_id where m.cabinet_id = any (ids)),
    'journal_acces', (select coalesce(jsonb_agg(to_jsonb(a) order by a.le desc), '[]') from public.audit_log a where a.user_id = uid or a.compte_id = any (ids))
  );
  perform private.journaliser('export_rgpd', 'comptes', null, ids[1]);
  return resultat;
end $$;
revoke all on function public.rgpd_export() from public, anon;
grant execute on function public.rgpd_export() to authenticated;

/**
 * Effacement. Un compte sans contrat est supprimé. Un compte lié à un contrat
 * est ANONYMISÉ : le contrat reste une pièce de preuve pour l'autre partie
 * (prescription de 5 ans), mais plus aucune donnée de contact n'est conservée.
 */
create or replace function public.rgpd_supprimer_mon_compte(confirmation text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c uuid;
begin
  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if confirmation is distinct from 'SUPPRIMER' then
    raise exception 'Confirmation attendue : SUPPRIMER' using errcode = '22023';
  end if;
  for c in select compte_id from public.compte_membres where user_id = uid loop
    perform private.journaliser('suppression_rgpd', 'comptes', c::text, c);
    if exists (select 1 from public.compte_membres where compte_id = c and user_id <> uid) then
      continue; -- d'autres titulaires gardent le cabinet ; on retire seulement ce membre (cascade ci-dessous)
    elsif exists (select 1 from public.contrats where cabinet_id = c or remplacant_id = c) then
      delete from public.pieces where compte_id = c;
      delete from public.badges where compte_id = c;
      delete from public.invitations where par_id = c;
      delete from public.candidatures where remplacant_id = c and statut = 'envoyee';
      delete from public.fiches_tournee where mission_id in (select id from public.missions where cabinet_id = c);
      delete from public.missions where cabinet_id = c and statut in ('brouillon', 'publiee');
      update public.comptes set
        prenom = 'Compte', nom = 'supprimé', email = null, telephone = null, ville = '—',
        nom_cabinet = case when nom_cabinet is null then null else 'Cabinet supprimé' end,
        soins_maitrises = '{}', disponibilites = '[]', anonymise_le = now()
      where id = c;
    else
      delete from public.comptes where id = c;
    end if;
  end loop;
  delete from auth.users where id = uid;
end $$;
revoke all on function public.rgpd_supprimer_mon_compte(text) from public, anon;
grant execute on function public.rgpd_supprimer_mon_compte(text) to authenticated;

/* ------------------------------------------------------------------ */
/* Rétention                                                           */
/* ------------------------------------------------------------------ */

create or replace function private.purger() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  n_fiches int; n_audit int; n_events int; n_quotas int;
begin
  delete from public.fiches_tournee f using public.missions m
    where m.id = f.mission_id and m.au < current_date - (private.parametre('retention_fiche_jours'))::int;
  get diagnostics n_fiches = row_count;
  delete from public.audit_log where le < now() - make_interval(days => (private.parametre('retention_audit_jours'))::int);
  get diagnostics n_audit = row_count;
  delete from public.stripe_events where recu_le < now() - interval '90 days';
  get diagnostics n_events = row_count;
  delete from private.quotas where fenetre < now() - interval '2 days';
  get diagnostics n_quotas = row_count;
  return jsonb_build_object('fiches', n_fiches, 'audit', n_audit, 'stripe_events', n_events, 'quotas', n_quotas);
end $$;
revoke all on function private.purger() from public, authenticated;

-- Planification quotidienne si pg_cron est disponible (c'est le cas sur Supabase).
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'releve-purge';
    perform cron.schedule('releve-purge', '17 3 * * *', 'select private.purger()');
  end if;
end $$;
