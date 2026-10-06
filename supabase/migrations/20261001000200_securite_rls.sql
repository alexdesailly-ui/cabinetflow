-- Relève — sécurité : fonctions d'appartenance, RLS sur TOUTES les tables,
-- privilèges par colonne, gardes métier côté serveur.
-- Principe : RLS décide QUELLES LIGNES, les GRANT par colonne décident QUELS CHAMPS,
-- les triggers « garde » décident QUELLES TRANSITIONS sont permises.

/* ------------------------------------------------------------------ */
/* Fonctions d'appartenance (security definer : évite la récursion RLS) */
/* ------------------------------------------------------------------ */

create or replace function private.mes_comptes() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select compte_id from public.compte_membres where user_id = auth.uid()
$$;

create or replace function private.est_membre(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.compte_membres where compte_id = c and user_id = auth.uid())
$$;

/** Appels « système » : migrations, seed, webhooks (service_role), tâches planifiées. */
create or replace function private.est_systeme() returns boolean
language sql stable set search_path = '' as $$
  select auth.uid() is null and (auth.role() = 'service_role' or current_user in ('postgres', 'supabase_admin', 'service_role'))
$$;

/**
 * Un compte voit l'identité complète (email, téléphone) d'un autre compte
 * uniquement s'il existe une relation de travail : candidature ou contrat.
 */
create or replace function private.peut_voir_compte(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.est_membre(c)
  or exists (
    select 1 from public.contrats k
    where (k.cabinet_id = c and k.remplacant_id in (select private.mes_comptes()))
       or (k.remplacant_id = c and k.cabinet_id in (select private.mes_comptes()))
  )
  or exists (
    select 1 from public.candidatures ca join public.missions m on m.id = ca.mission_id
    where (ca.remplacant_id = c and m.cabinet_id in (select private.mes_comptes()))
       or (m.cabinet_id = c and ca.remplacant_id in (select private.mes_comptes()))
  )
$$;

create or replace function private.est_cabinet_de_mission(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.missions where id = m and cabinet_id in (select private.mes_comptes()))
$$;

create or replace function private.a_candidate(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.candidatures where mission_id = m and remplacant_id in (select private.mes_comptes()))
$$;

create or replace function private.mission_publiee(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.missions where id = m and statut = 'publiee')
$$;

create or replace function private.est_partie_contrat(k uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contrats where id = k
    and (cabinet_id in (select private.mes_comptes()) or remplacant_id in (select private.mes_comptes()))
  )
$$;

create or replace function private.est_cabinet_de_contrat(k uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.contrats where id = k and cabinet_id in (select private.mes_comptes()))
$$;

/**
 * Feature-gating serveur : un cabinet peut PUBLIER une mission s'il est en essai
 * (14 jours + mois offerts par parrainage) ou si son abonnement Stripe est
 * actif / en essai / en retard de paiement (Stripe relance pendant ce temps).
 */
create or replace function private.cabinet_actif(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.cabinet_id = c and s.statut in ('trialing', 'active', 'past_due')
  ) or exists (
    select 1 from public.comptes k
    where k.id = c and k.role = 'cabinet'
      and k.cree_le + interval '14 days' + make_interval(days => 30 * k.mois_offerts) > now()
  )
$$;

/** Limitation de débit : lève une exception au-delà de `max` appels par fenêtre. */
create or replace function private.quota(cle text, max int, secondes int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  f timestamptz := to_timestamp(floor(extract(epoch from now()) / secondes) * secondes);
  n int;
begin
  insert into private.quotas (cle, fenetre, compteur) values (cle, f, 1)
  on conflict on constraint quotas_pkey do update set compteur = private.quotas.compteur + 1
  returning compteur into n;
  if n > max then
    raise exception 'Trop de requêtes, réessayez plus tard' using errcode = 'P0429';
  end if;
end $$;

grant execute on all functions in schema private to authenticated, service_role;

/* ------------------------------------------------------------------ */
/* Journal d'audit générique                                           */
/* ------------------------------------------------------------------ */

create or replace function private.journaliser(action text, cible_table text, cible_id text, compte uuid, details jsonb default '{}')
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (user_id, compte_id, action, cible_table, cible_id, details)
  values (auth.uid(), compte, action, cible_table, cible_id, coalesce(details, '{}'))
$$;

create or replace function private.audit_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ligne jsonb := to_jsonb(coalesce(new, old));
  avant jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}' end;
  modifiees text[];
  compte uuid;
begin
  if tg_op = 'UPDATE' then
    select array_agg(k) into modifiees from jsonb_each(ligne) e(k, v) where avant -> k is distinct from v;
  end if;
  compte := coalesce(
    (ligne ->> 'compte_id')::uuid, (ligne ->> 'cabinet_id')::uuid, (ligne ->> 'par_id')::uuid,
    case when tg_table_name = 'comptes' then (ligne ->> 'id')::uuid end
  );
  perform private.journaliser(
    lower(tg_op), tg_table_name,
    coalesce(ligne ->> 'id', ligne ->> 'mission_id', ligne ->> 'cabinet_id'),
    compte,
    case when modifiees is null then '{}' else jsonb_build_object('colonnes', modifiees) end
  );
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['comptes', 'compte_membres', 'pieces', 'contrats', 'lignes_retrocession', 'subscriptions'] loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_trigger()', t);
  end loop;
end $$;

/* ------------------------------------------------------------------ */
/* RLS : activée partout, aucune table sans politique explicite        */
/* ------------------------------------------------------------------ */

do $$ declare t text; begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- comptes ---------------------------------------------------------------
drop policy if exists comptes_select on public.comptes;
create policy comptes_select on public.comptes for select to authenticated
  using (private.peut_voir_compte(id));
drop policy if exists comptes_update on public.comptes;
create policy comptes_update on public.comptes for update to authenticated
  using (private.est_membre(id)) with check (private.est_membre(id));
grant select on public.comptes to authenticated;
grant update (prenom, nom, email, telephone, ville, code_postal, nom_cabinet, nb_titulaires, patients_tournee,
  ca_journalier_moyen, rayon_km, vehicule, annees_experience, soins_maitrises, disponibilites) on public.comptes to authenticated;
-- Création : uniquement via public.creer_compte() (parrainage et appartenance gérés côté serveur).

-- compte_membres --------------------------------------------------------
drop policy if exists membres_select on public.compte_membres;
create policy membres_select on public.compte_membres for select to authenticated
  using (private.est_membre(compte_id));
grant select on public.compte_membres to authenticated;

-- pieces ----------------------------------------------------------------
drop policy if exists pieces_select on public.pieces;
create policy pieces_select on public.pieces for select to authenticated
  using (private.peut_voir_compte(compte_id));
drop policy if exists pieces_write on public.pieces;
create policy pieces_write on public.pieces for all to authenticated
  using (private.est_membre(compte_id)) with check (private.est_membre(compte_id));
grant select, delete on public.pieces to authenticated;
grant insert (id, compte_id, key, reference, expire_le, fournie_le) on public.pieces to authenticated;
grant update (reference, expire_le, fournie_le) on public.pieces to authenticated;

-- missions --------------------------------------------------------------
drop policy if exists missions_select on public.missions;
create policy missions_select on public.missions for select to authenticated using (
  private.est_membre(cabinet_id)
  or statut = 'publiee'
  or remplacant_retenu_id in (select private.mes_comptes())
  or private.a_candidate(id)
);
drop policy if exists missions_insert on public.missions;
create policy missions_insert on public.missions for insert to authenticated with check (
  private.est_membre(cabinet_id) and (statut <> 'publiee' or private.cabinet_actif(cabinet_id))
);
drop policy if exists missions_update on public.missions;
create policy missions_update on public.missions for update to authenticated
  using (private.est_membre(cabinet_id))
  with check (private.est_membre(cabinet_id) and (statut <> 'publiee' or private.cabinet_actif(cabinet_id)));
drop policy if exists missions_delete on public.missions;
create policy missions_delete on public.missions for delete to authenticated
  using (private.est_membre(cabinet_id) and statut = 'brouillon');
grant select, delete on public.missions to authenticated;
grant insert (id, cabinet_id, motif, du, au, jours_travailles, dimanches_feries, ca_journalier, retrocession_pct, patients_jour,
  km_jour, horaires, soins_requis, vehicule_fourni, logement_fourni, commentaire, statut, publiee_le, invites_directs) on public.missions to authenticated;
grant update (motif, du, au, jours_travailles, dimanches_feries, ca_journalier, retrocession_pct, patients_jour, km_jour, horaires,
  soins_requis, vehicule_fourni, logement_fourni, commentaire, statut, publiee_le, remplacant_retenu_id, invites_directs) on public.missions to authenticated;

-- candidatures ----------------------------------------------------------
drop policy if exists candidatures_select on public.candidatures;
create policy candidatures_select on public.candidatures for select to authenticated
  using (remplacant_id in (select private.mes_comptes()) or private.est_cabinet_de_mission(mission_id));
drop policy if exists candidatures_insert on public.candidatures;
create policy candidatures_insert on public.candidatures for insert to authenticated with check (
  remplacant_id in (select private.mes_comptes())
  and private.mission_publiee(mission_id)
);
drop policy if exists candidatures_update on public.candidatures;
create policy candidatures_update on public.candidatures for update to authenticated
  using (remplacant_id in (select private.mes_comptes()) or private.est_cabinet_de_mission(mission_id))
  with check (remplacant_id in (select private.mes_comptes()) or private.est_cabinet_de_mission(mission_id));
drop policy if exists candidatures_delete on public.candidatures;
create policy candidatures_delete on public.candidatures for delete to authenticated
  using (remplacant_id in (select private.mes_comptes()) and statut = 'envoyee');
grant select, delete on public.candidatures to authenticated;
grant insert (id, mission_id, remplacant_id, message) on public.candidatures to authenticated;
grant update (message, statut) on public.candidatures to authenticated;

-- contrats --------------------------------------------------------------
drop policy if exists contrats_select on public.contrats;
create policy contrats_select on public.contrats for select to authenticated
  using (private.est_membre(cabinet_id) or private.est_membre(remplacant_id));
drop policy if exists contrats_insert on public.contrats;
create policy contrats_insert on public.contrats for insert to authenticated with check (
  private.est_membre(cabinet_id)
  and exists (select 1 from public.missions m where m.id = contrats.mission_id and m.cabinet_id = contrats.cabinet_id and m.remplacant_retenu_id = contrats.remplacant_id)
);
drop policy if exists contrats_update on public.contrats;
create policy contrats_update on public.contrats for update to authenticated
  using (private.est_membre(cabinet_id) or private.est_membre(remplacant_id))
  with check (private.est_membre(cabinet_id) or private.est_membre(remplacant_id));
grant select on public.contrats to authenticated;
grant insert (id, mission_id, cabinet_id, remplacant_id, retrocession_pct, echeance_reversement, clause_non_concurrence) on public.contrats to authenticated;
grant update (retrocession_pct, echeance_reversement, clause_non_concurrence, signature_titulaire, signature_remplacant, transmis_cdoi_le) on public.contrats to authenticated;

-- lignes de rétrocession ------------------------------------------------
drop policy if exists lignes_select on public.lignes_retrocession;
create policy lignes_select on public.lignes_retrocession for select to authenticated
  using (private.est_partie_contrat(contrat_id));
drop policy if exists lignes_write on public.lignes_retrocession;
create policy lignes_write on public.lignes_retrocession for all to authenticated
  using (private.est_cabinet_de_contrat(contrat_id)) with check (private.est_cabinet_de_contrat(contrat_id));
grant select, delete on public.lignes_retrocession to authenticated;
grant insert (id, contrat_id, libelle, du, au, ca_encaisse, pct, echeance, payee_le) on public.lignes_retrocession to authenticated;
grant update (libelle, du, au, ca_encaisse, pct, echeance, payee_le) on public.lignes_retrocession to authenticated;

-- recommandations : publiques entre membres, créées seulement après un contrat signé
drop policy if exists recos_select on public.recommandations;
create policy recos_select on public.recommandations for select to authenticated using (true);
drop policy if exists recos_insert on public.recommandations;
create policy recos_insert on public.recommandations for insert to authenticated with check (
  private.est_membre(de_id)
  and exists (
    select 1 from public.contrats k where k.id = recommandations.contrat_id
      and k.signature_titulaire is not null and k.signature_remplacant is not null
      and ((k.cabinet_id = recommandations.de_id and k.remplacant_id = recommandations.vers_id)
        or (k.remplacant_id = recommandations.de_id and k.cabinet_id = recommandations.vers_id))
  )
);
drop policy if exists recos_delete on public.recommandations;
create policy recos_delete on public.recommandations for delete to authenticated using (private.est_membre(de_id));
grant select, delete on public.recommandations to authenticated;
grant insert (id, contrat_id, de_id, vers_id, note, texte) on public.recommandations to authenticated;

-- fiches de passation : AUCUN accès direct. Lecture/écriture via RPC chiffrées et journalisées.
drop policy if exists fiches_aucun_acces_direct on public.fiches_tournee;
create policy fiches_aucun_acces_direct on public.fiches_tournee for all to authenticated using (false) with check (false);

-- invitations -----------------------------------------------------------
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations for select to authenticated
  using (private.est_membre(par_id) or filleul_id in (select private.mes_comptes()));
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert to authenticated
  with check (private.est_membre(par_id) and filleul_id is null and actif_le is null);
grant select on public.invitations to authenticated;
grant insert (id, par_id, nom, canal) on public.invitations to authenticated;

-- badges ----------------------------------------------------------------
drop policy if exists badges_select on public.badges;
create policy badges_select on public.badges for select to authenticated using (true);
drop policy if exists badges_insert on public.badges;
create policy badges_insert on public.badges for insert to authenticated with check (private.est_membre(compte_id));
grant select on public.badges to authenticated;
grant insert (compte_id, key) on public.badges to authenticated;

-- audit : chacun consulte les traces de ses comptes (droit d'accès RGPD)
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (user_id = auth.uid() or compte_id in (select private.mes_comptes()));
grant select on public.audit_log to authenticated;

-- abonnements : lecture seule pour le cabinet ; écriture par le webhook (service_role)
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (private.est_membre(cabinet_id));
grant select on public.subscriptions to authenticated;

drop policy if exists stripe_events_aucun on public.stripe_events;
create policy stripe_events_aucun on public.stripe_events for all to authenticated using (false) with check (false);

grant all on all tables in schema public to service_role;

/* ------------------------------------------------------------------ */
/* Gardes métier (transitions autorisées)                              */
/* ------------------------------------------------------------------ */

create or replace function private.garde_mission() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.est_systeme() then return new; end if;
  if tg_op = 'INSERT' then
    if new.statut not in ('brouillon', 'publiee') then
      raise exception 'Une mission se crée en brouillon ou publiée' using errcode = '42501';
    end if;
    new.remplacant_retenu_id := null;
  end if;
  if new.statut = 'publiee' and (tg_op = 'INSERT' or old.statut <> 'publiee') then
    new.publiee_le := now();
  end if;
  if new.remplacant_retenu_id is not null and (tg_op = 'INSERT' or new.remplacant_retenu_id is distinct from old.remplacant_retenu_id) then
    if not exists (select 1 from public.candidatures c where c.mission_id = new.id and c.remplacant_id = new.remplacant_retenu_id) then
      raise exception 'Seul un candidat peut être retenu' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists garde on public.missions;
create trigger garde before insert or update on public.missions for each row execute function private.garde_mission();

create or replace function private.garde_candidature() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.est_systeme() then return new; end if;
  if tg_op = 'INSERT' then
    perform private.quota('candidature:' || auth.uid(), 30, 3600);
    if not exists (select 1 from public.comptes where id = new.remplacant_id and role = 'remplacant') then
      raise exception 'Seul un remplaçant peut candidater' using errcode = '42501';
    end if;
    new.statut := 'envoyee';
    new.envoyee_le := now();
  elsif new.statut is distinct from old.statut and not private.est_cabinet_de_mission(old.mission_id) then
    raise exception 'Seul le cabinet décide du statut d''une candidature' using errcode = '42501';
  elsif new.message is distinct from old.message and not (old.remplacant_id in (select private.mes_comptes())) then
    raise exception 'Seul le remplaçant modifie son message' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists garde on public.candidatures;
create trigger garde before insert or update on public.candidatures for each row execute function private.garde_candidature();

/**
 * Les contrôles « bloquants » de src/lib/domain.ts (controlerAffectation), rejoués
 * côté serveur au moment de signer : autorisation valable jusqu'au dernier jour,
 * RCP en cours, deux remplacements simultanés au maximum.
 */
create or replace function private.controler_affectation(mission uuid, remplacant uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  m public.missions;
  autorisation date;
  rcp_ok boolean;
  paralleles int;
begin
  select * into m from public.missions where id = mission;
  select expire_le into autorisation from public.pieces
    where compte_id = remplacant and key = 'autorisation' and fournie_le is not null;
  if autorisation is null or autorisation < m.au then
    raise exception 'Autorisation de remplacement absente ou expirée avant la fin du remplacement' using errcode = '23514';
  end if;
  select exists (select 1 from public.pieces where compte_id = remplacant and key = 'rcp' and fournie_le is not null
    and (expire_le is null or expire_le >= current_date)) into rcp_ok;
  if not rcp_ok then
    raise exception 'RCP absente ou expirée' using errcode = '23514';
  end if;
  select count(*) into paralleles from public.contrats k join public.missions x on x.id = k.mission_id
    where k.remplacant_id = remplacant and k.mission_id <> mission
      and k.signature_titulaire is not null and k.signature_remplacant is not null
      and x.du <= m.au and x.au >= m.du;
  if paralleles >= 2 then
    raise exception 'Plus de deux remplacements simultanés' using errcode = '23514';
  end if;
end $$;

/**
 * Contrat : chaque partie ne signe que pour elle-même, la date de signature est
 * posée par le serveur, et un contrat signé ne change plus (sauf transmission à l'Ordre).
 */
create or replace function private.garde_contrat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  cote_cabinet boolean := private.est_membre(old.cabinet_id);
  cote_remplacant boolean := private.est_membre(old.remplacant_id);
  termes_modifies boolean := (new.retrocession_pct, new.echeance_reversement, new.clause_non_concurrence)
    is distinct from (old.retrocession_pct, old.echeance_reversement, old.clause_non_concurrence);
begin
  if private.est_systeme() then return new; end if;
  if tg_op = 'INSERT' then
    new.signature_titulaire := null;
    new.signature_remplacant := null;
    new.transmis_cdoi_le := null;
    return new;
  end if;
  if termes_modifies and (not cote_cabinet or old.signature_titulaire is not null or old.signature_remplacant is not null) then
    raise exception 'Les termes d''un contrat signé ne changent plus' using errcode = '42501';
  end if;
  if (new.signature_titulaire is distinct from old.signature_titulaire or new.signature_remplacant is distinct from old.signature_remplacant) then
    perform private.controler_affectation(old.mission_id, old.remplacant_id);
  end if;
  if new.signature_titulaire is distinct from old.signature_titulaire then
    if old.signature_titulaire is not null or not cote_cabinet or (new.signature_titulaire ->> 'parId')::uuid is distinct from old.cabinet_id then
      raise exception 'Signature titulaire non autorisée' using errcode = '42501';
    end if;
    new.signature_titulaire := new.signature_titulaire || jsonb_build_object('le', now());
  end if;
  if new.signature_remplacant is distinct from old.signature_remplacant then
    if old.signature_remplacant is not null or not cote_remplacant or (new.signature_remplacant ->> 'parId')::uuid is distinct from old.remplacant_id then
      raise exception 'Signature remplaçant non autorisée' using errcode = '42501';
    end if;
    new.signature_remplacant := new.signature_remplacant || jsonb_build_object('le', now());
  end if;
  if new.transmis_cdoi_le is distinct from old.transmis_cdoi_le then
    if not cote_cabinet or old.transmis_cdoi_le is not null then
      raise exception 'Seul le cabinet déclare la transmission à l''Ordre' using errcode = '42501';
    end if;
    new.transmis_cdoi_le := now();
  end if;
  return new;
end $$;
drop trigger if exists garde on public.contrats;
create trigger garde before insert or update on public.contrats for each row execute function private.garde_contrat();

/**
 * Parrainage côté serveur : un filleul devient « actif » à sa première signature,
 * le parrain cabinet gagne un mois, plafonné à 12 par année civile.
 */
create or replace function private.activer_parrainage() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  signataire uuid;
  inv public.invitations;
  parrain public.comptes;
begin
  foreach signataire in array array[
    case when old.signature_titulaire is null and new.signature_titulaire is not null then new.cabinet_id end,
    case when old.signature_remplacant is null and new.signature_remplacant is not null then new.remplacant_id end
  ] loop
    continue when signataire is null;
    select * into inv from public.invitations where filleul_id = signataire and actif_le is null order by le limit 1;
    continue when inv.id is null;
    update public.invitations set actif_le = now() where id = inv.id;
    select * into parrain from public.comptes where id = inv.par_id;
    if parrain.role = 'cabinet' and (
      select count(*) from public.invitations
      where par_id = parrain.id and actif_le >= date_trunc('year', now())
    ) <= 12 then
      update public.comptes set mois_offerts = mois_offerts + 1 where id = parrain.id;
    end if;
  end loop;
  return null;
end $$;
drop trigger if exists parrainage on public.contrats;
create trigger parrainage after update on public.contrats for each row execute function private.activer_parrainage();

/* ------------------------------------------------------------------ */
/* RPC publiques                                                       */
/* ------------------------------------------------------------------ */

create or replace function private.generer_code(prenom text, nom text) returns text
language plpgsql volatile set search_path = '' as $$
declare
  base text := upper(regexp_replace(
    translate(left(prenom, 3) || left(nom, 3), 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC'),
    '[^A-Za-z]', '', 'g'));
  code text;
begin
  if base = '' then base := 'IDEL'; end if;
  loop
    code := base || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 3));
    exit when not exists (select 1 from public.comptes where code_parrain = code);
  end loop;
  return code;
end $$;

/**
 * Création du compte de l'utilisateur connecté (un par rôle). Gère l'appartenance,
 * le code de parrainage, le mois offert du filleul cabinet et l'invitation.
 */
create or replace function public.creer_compte(donnees jsonb, code_parrain_invitant text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  role_demande text := donnees ->> 'role';
  existant uuid;
  parrain public.comptes;
  nouvel_id uuid;
  attente uuid;
begin
  if uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  perform private.quota('creer_compte:' || uid, 5, 3600);
  select c.id into existant from public.comptes c join public.compte_membres m on m.compte_id = c.id
    where m.user_id = uid and c.role = role_demande limit 1;
  if existant is not null then return existant; end if;

  if code_parrain_invitant is not null then
    select * into parrain from public.comptes where code_parrain = upper(code_parrain_invitant);
  end if;

  insert into public.comptes (
    role, prenom, nom, email, telephone, ville, code_postal,
    nom_cabinet, nb_titulaires, patients_tournee, ca_journalier_moyen,
    rayon_km, vehicule, annees_experience, soins_maitrises,
    code_parrain, parraine_par, plan, mois_offerts
  ) values (
    role_demande, trim(donnees ->> 'prenom'), trim(donnees ->> 'nom'),
    coalesce(nullif(trim(donnees ->> 'email'), ''), (select email from auth.users where id = uid)),
    nullif(trim(donnees ->> 'telephone'), ''), trim(donnees ->> 'ville'), donnees ->> 'codePostal',
    nullif(trim(donnees ->> 'nomCabinet'), ''), (donnees ->> 'nbTitulaires')::int, (donnees ->> 'patientsTournee')::int,
    (donnees ->> 'caJournalierMoyen')::int, (donnees ->> 'rayonKm')::int, (donnees ->> 'vehicule')::boolean,
    (donnees ->> 'anneesExperience')::int,
    coalesce(array(select jsonb_array_elements_text(donnees -> 'soinsMaitrises')), '{}'),
    private.generer_code(donnees ->> 'prenom', donnees ->> 'nom'),
    parrain.code_parrain,
    case when role_demande = 'cabinet' then 'essai' else 'gratuit' end,
    case when parrain.id is not null and role_demande = 'cabinet' then 1 else 0 end
  ) returning id into nouvel_id;

  insert into public.compte_membres (compte_id, user_id) values (nouvel_id, uid);

  if parrain.id is not null then
    select id into attente from public.invitations
      where par_id = parrain.id and filleul_id is null and canal = 'lien' order by le limit 1;
    if attente is not null then
      update public.invitations set filleul_id = nouvel_id where id = attente;
    else
      insert into public.invitations (par_id, nom, canal, filleul_id)
      values (parrain.id, trim(donnees ->> 'prenom') || ' ' || trim(donnees ->> 'nom'), 'lien', nouvel_id);
    end if;
  end if;
  return nouvel_id;
end $$;
revoke all on function public.creer_compte(jsonb, text) from public, anon;
grant execute on function public.creer_compte(jsonb, text) to authenticated;

/** Page d'invitation (avant connexion) : ne révèle que le nom affichable du parrain. */
create or replace function public.parrain_par_code(code text)
returns table (prenom text, nom text, nom_cabinet text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query select c.prenom, c.nom, c.nom_cabinet from public.comptes c
    where c.code_parrain = upper(code) and c.anonymise_le is null;
end $$;
revoke all on function public.parrain_par_code(text) from public;
grant execute on function public.parrain_par_code(text) to anon, authenticated;

/**
 * Annuaire : ce que tout membre connecté voit des autres comptes (vivier,
 * cabinets des annonces). Jamais d'email, de téléphone ni de référence de pièce.
 */
create or replace function public.annuaire()
returns table (
  id uuid, role text, cree_le timestamptz, prenom text, nom text, ville text, code_postal text, departement text,
  nom_cabinet text, rayon_km int, vehicule boolean, annees_experience int, soins_maitrises text[], disponibilites jsonb,
  pieces jsonb
) language sql stable security definer set search_path = '' as $$
  select c.id, c.role, c.cree_le, c.prenom, c.nom, c.ville, c.code_postal, c.departement,
    c.nom_cabinet, c.rayon_km, c.vehicule, c.annees_experience, c.soins_maitrises, c.disponibilites,
    coalesce((select jsonb_agg(jsonb_build_object('key', p.key, 'expireLe', p.expire_le, 'fournieLe', p.fournie_le))
              from public.pieces p where p.compte_id = c.id), '[]')
  from public.comptes c
  where auth.uid() is not null and c.anonymise_le is null
$$;
revoke all on function public.annuaire() from public, anon;
grant execute on function public.annuaire() to authenticated;
