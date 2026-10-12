-- Contrôle d'un vrai projet Supabase.
--
-- La suite de tests (supabase/tests) tourne sur une simulation de Supabase. Ce script
-- vérifie ce qu'elle ne peut pas garantir : fonctions d'identité, rôles, coffre de clés
-- (Vault), extensions, et le parcours des fonctions de l'application sur la vraie plateforme.
--
-- À coller dans l'éditeur SQL du projet. Rien ne subsiste : tout s'écrit dans une transaction
-- que le script annule lui-même en finissant par une erreur, dont le message est le compte rendu.
-- Aucune instruction de suppression dans ce texte : il passe aussi les garde-fous des outils d'exécution SQL.

begin;

create temp table controles (intitule text not null, ok boolean not null, le timestamptz not null default clock_timestamp());
grant all on controles to anon, authenticated, service_role;

create function pg_temp.verifier(intitule text, ok boolean) returns void language sql as $$
  insert into controles (intitule, ok) values (intitule, coalesce(ok, false))
$$;

/** Prend l'identité d'un utilisateur, comme le fait PostgREST à partir du jeton d'accès. */
create function pg_temp.connecter(uid uuid) returns void language plpgsql as $$
begin
  reset role;
  if uid is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
    set local role authenticated;
  end if;
end $$;

create function pg_temp.service() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  set local role service_role;
end $$;

create function pg_temp.systeme() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

/* ------------------------------------------------------------------ */
/* 1. Plateforme : rôles, extensions, coffre de clés                    */
/* ------------------------------------------------------------------ */

select pg_temp.verifier('rôles anon, authenticated et service_role présents',
  (select count(*) = 3 from pg_roles where rolname in ('anon', 'authenticated', 'service_role')));

select pg_temp.verifier('pgcrypto installée dans le schéma extensions',
  exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto' and n.nspname = 'extensions'));

do $$ begin
  if to_regclass('vault.decrypted_secrets') is null then
    perform pg_temp.verifier('Vault : secret releve_cle_donnees (ignoré hors Supabase)', true);
  else
    perform pg_temp.verifier('Vault : secret releve_cle_donnees présent, 32 caractères au moins',
      coalesce((select length(decrypted_secret) >= 32 from vault.decrypted_secrets where name = 'releve_cle_donnees' limit 1), false));
  end if;
end $$;

select pg_temp.verifier('pg_cron disponible pour la purge quotidienne (ignoré sans Vault, donc hors Supabase)',
  case when to_regclass('vault.decrypted_secrets') is null then true
       else exists (select 1 from pg_available_extensions where name = 'pg_cron') end);

select pg_temp.verifier('chiffrement des fiches : aller-retour correct avec la clé de la plateforme',
  private.dechiffrer(private.chiffrer('{"consignes": "clé sous le pot"}')) = '{"consignes": "clé sous le pot"}'::jsonb);

select pg_temp.verifier('le texte chiffré ne contient pas le texte clair',
  position(convert_to('clé sous le pot', 'UTF8') in private.chiffrer('{"consignes": "clé sous le pot"}')) = 0);

select pg_temp.verifier('l''identité système est reconnue pour le propriétaire de la base', private.est_systeme());

/* ------------------------------------------------------------------ */
/* 2. Identité : auth.uid() lit bien le jeton                          */
/* ------------------------------------------------------------------ */

insert into auth.users (id, email) values
  ('a0a0a0a0-0000-4000-8000-00000000000a', 'controle.a@exemple.invalid'),
  ('a0a0a0a0-0000-4000-8000-00000000000b', 'controle.b@exemple.invalid');

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000a');
select pg_temp.verifier('authenticated : auth.uid() renvoie l''identifiant du jeton', auth.uid() = 'a0a0a0a0-0000-4000-8000-00000000000a');
select pg_temp.verifier('authenticated : l''identité système n''est pas reconnue', not private.est_systeme());

select pg_temp.connecter(null);
select pg_temp.verifier('anon : auth.uid() est nul', auth.uid() is null);
select pg_temp.verifier('anon : la page d''invitation peut lire les paramètres publics', public.parametres_publics() is not null);
select pg_temp.verifier('anon : un code de parrainage inconnu ne révèle rien', not exists (select 1 from public.parrain_par_code('ZZZ-000')));

/* ------------------------------------------------------------------ */
/* 3. Parcours de l'application, comme un navigateur le ferait         */
/* ------------------------------------------------------------------ */

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000a');
select public.creer_compte('{"role": "cabinet", "prenom": "Contrôle", "nom": "Alpha", "ville": "Angers", "codePostal": "49000", "nomCabinet": "Cabinet de contrôle A"}');
select pg_temp.verifier('création de compte cabinet : compte en essai', (select plan = 'essai' and role = 'cabinet' from public.comptes where nom = 'Alpha'));

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000b');
select public.creer_compte('{"role": "cabinet", "prenom": "Contrôle", "nom": "Bravo", "ville": "Nantes", "codePostal": "44000", "nomCabinet": "Cabinet de contrôle B"}');

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000a');
insert into public.missions (cabinet_id, motif, du, au, jours_travailles, ca_journalier, retrocession_pct)
  select id, 'Congés', current_date + 30, current_date + 43, 14, 480, 85 from public.comptes where nom = 'Alpha';
select pg_temp.verifier('le cabinet A voit son brouillon', (select count(*) = 1 from public.missions));

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000b');
select pg_temp.verifier('le cabinet B ne voit pas le brouillon du cabinet A', (select count(*) = 0 from public.missions));

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000a');
update public.missions set statut = 'publiee' where cabinet_id in (select id from public.comptes where nom = 'Alpha');
select pg_temp.verifier('publication autorisée pendant l''essai', (select statut = 'publiee' from public.missions));

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000b');
select pg_temp.verifier('une mission publiée est visible des autres cabinets', (select count(*) = 1 from public.missions));

select pg_temp.connecter(null);
do $$ begin
  begin
    perform count(*) from public.missions;
    perform pg_temp.verifier('anon : aucun accès aux missions', false);
  exception when insufficient_privilege then
    perform pg_temp.verifier('anon : aucun accès aux missions', true);
  end;
end $$;

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000a');
do $$ begin
  begin
    update public.comptes set plan = 'cabinet' where nom = 'Alpha';
    perform pg_temp.verifier('un cabinet ne peut pas s''attribuer un plan payant', false);
  exception when insufficient_privilege then
    perform pg_temp.verifier('un cabinet ne peut pas s''attribuer un plan payant', true);
  end;
  begin
    insert into public.subscriptions (cabinet_id, statut) select id, 'active' from public.comptes where nom = 'Alpha';
    perform pg_temp.verifier('un cabinet ne peut pas écrire son abonnement', false);
  exception when insufficient_privilege then
    perform pg_temp.verifier('un cabinet ne peut pas écrire son abonnement', true);
  end;
  begin
    perform count(*) from public.fiches_tournee;
    perform pg_temp.verifier('aucune lecture directe des fiches de passation', false);
  exception when insufficient_privilege then
    perform pg_temp.verifier('aucune lecture directe des fiches de passation', true);
  end;
end $$;

select public.fiche_enregistrer((select id from public.missions), '{"consignes": "Clé sous le pot bleu", "patients": []}');
select pg_temp.verifier('fiche de passation : relue en clair par son cabinet',
  public.fiche_lire((select id from public.missions)) ->> 'consignes' = 'Clé sous le pot bleu');
select pg_temp.verifier('export RGPD : les données du compte sont renvoyées',
  jsonb_array_length(public.rgpd_export() -> 'comptes') = 1);

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000b');
select pg_temp.verifier('fiche de passation : illisible pour un autre cabinet', public.fiche_lire((select id from public.missions)) is null);

/* ------------------------------------------------------------------ */
/* 4. Abonnement : écrit par le webhook (service_role), pas par les utilisateurs */
/* ------------------------------------------------------------------ */

select pg_temp.service();
insert into public.subscriptions (cabinet_id, stripe_customer_id, statut)
  select id, 'cus_controle_a', 'active' from public.comptes where nom = 'Alpha';
select pg_temp.verifier('abonnement actif : le plan du cabinet devient « cabinet »', (select plan = 'cabinet' from public.comptes where nom = 'Alpha'));
update public.subscriptions set statut = 'canceled' where stripe_customer_id = 'cus_controle_a';
select pg_temp.verifier('abonnement résilié : le plan revient à « essai »', (select plan = 'essai' from public.comptes where nom = 'Alpha'));
select pg_temp.verifier('essai restant lisible par le service (13 ou 14 jours pour un compte neuf)',
  public.essai_restant_jours((select id from public.comptes where nom = 'Alpha')) between 13 and 14);

select pg_temp.verifier('enregistrer_abonnement : une première lecture est écrite',
  public.enregistrer_abonnement(jsonb_build_object('cabinet_id', (select id from public.comptes where nom = 'Bravo'), 'stripe_customer_id', 'cus_controle_b',
    'stripe_subscription_id', 'sub_controle_b', 'statut', 'active', 'cancel_at_period_end', false, 'maj_le', now())));
select pg_temp.verifier('enregistrer_abonnement : l''abonnement actif ouvre le plan « cabinet »', (select plan = 'cabinet' from public.comptes where nom = 'Bravo'));
select pg_temp.verifier('enregistrer_abonnement : une lecture plus ancienne est ignorée',
  not public.enregistrer_abonnement(jsonb_build_object('cabinet_id', (select id from public.comptes where nom = 'Bravo'), 'stripe_customer_id', 'cus_controle_b',
    'stripe_subscription_id', 'sub_controle_b', 'statut', 'canceled', 'cancel_at_period_end', false, 'maj_le', now() - interval '1 hour')));

select pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000a');
do $$ begin
  begin
    perform public.enregistrer_abonnement('{}');
    perform pg_temp.verifier('enregistrer_abonnement est réservée au service', false);
  exception when insufficient_privilege then
    perform pg_temp.verifier('enregistrer_abonnement est réservée au service', true);
  end;
end $$;

select pg_temp.systeme();
insert into public.stripe_events (id, type) values ('evt_controle', 'invoice.paid');
do $$ begin
  begin
    insert into public.stripe_events (id, type) values ('evt_controle', 'invoice.paid');
    perform pg_temp.verifier('un événement Stripe n''est traité qu''une fois', false);
  exception when unique_violation then
    perform pg_temp.verifier('un événement Stripe n''est traité qu''une fois', true);
  end;
end $$;

select pg_temp.verifier('journal d''audit : la création et la signature de compte sont tracées',
  (select count(*) >= 2 from public.audit_log where cible_table in ('comptes', 'subscriptions')));

do $$ begin
  perform private.quota('controle-plateforme', 2, 60);
  perform private.quota('controle-plateforme', 2, 60);
  begin
    perform private.quota('controle-plateforme', 2, 60);
    perform pg_temp.verifier('limitation de débit : refus au-delà du plafond', false);
  exception when sqlstate 'P0429' then
    perform pg_temp.verifier('limitation de débit : refus au-delà du plafond', true);
  end;
end $$;

/* ------------------------------------------------------------------ */
/* 5. Effacement RGPD et rétention (migration « suppressions et purge »)*/
/* ------------------------------------------------------------------ */

select pg_temp.verifier('effacement RGPD et purge de rétention installés (migration suppressions_et_purge)',
  to_regprocedure('public.rgpd_supprimer_mon_compte(text)') is not null and to_regprocedure('private.purger()') is not null);

do $$ begin
  if to_regprocedure('public.rgpd_supprimer_mon_compte(text)') is null then return; end if;

  -- Le cabinet Bravo a un abonnement qui se renouvelle : il doit d'abord le résilier.
  perform pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000b');
  begin
    perform public.rgpd_supprimer_mon_compte('SUPPRIMER');
    perform pg_temp.verifier('effacement RGPD : refusé tant que l''abonnement se renouvelle', false);
  exception when sqlstate '55000' then
    perform pg_temp.verifier('effacement RGPD : refusé tant que l''abonnement se renouvelle', true);
  end;

  perform pg_temp.service();
  update public.subscriptions set cancel_at_period_end = true where stripe_customer_id = 'cus_controle_b';
  perform pg_temp.connecter('a0a0a0a0-0000-4000-8000-00000000000b');
  perform public.rgpd_supprimer_mon_compte('SUPPRIMER');
  perform pg_temp.systeme();
  perform pg_temp.verifier('effacement RGPD : le compte et sa connexion disparaissent une fois la résiliation programmée',
    not exists (select 1 from public.comptes where nom = 'Bravo') and not exists (select 1 from auth.users where id = 'a0a0a0a0-0000-4000-8000-00000000000b'));
end $$;

/* ------------------------------------------------------------------ */
/* Compte rendu, puis annulation de tout                               */
/* ------------------------------------------------------------------ */

do $$
declare
  rapport text;
  echecs int;
begin
  perform pg_temp.systeme();
  select string_agg((case when ok then 'OK     ' else 'ÉCHEC  ' end) || intitule, E'\n' order by le), count(*) filter (where not ok)
    into rapport, echecs from controles;
  raise exception E'CONTRÔLE DE LA PLATEFORME : % échec(s) sur % contrôles (transaction annulée volontairement)\n%',
    echecs, (select count(*) from controles), rapport;
end $$;
