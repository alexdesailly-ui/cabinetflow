-- Aucune table sans RLS, aucune table sans politique, rien d'ouvert à « anon ».
begin;

select tests.ok(
  not exists (select 1 from pg_tables where schemaname = 'public' and tablename not in (
    select relname from pg_class where relnamespace = 'public'::regnamespace and relrowsecurity and relforcerowsecurity)),
  'RLS activée et forcée sur toutes les tables de public');

select tests.ok(
  not exists (select 1 from pg_tables t where schemaname = 'public'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)),
  'chaque table de public a au moins une politique');

select tests.ok(
  not exists (select 1 from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'),
  'aucun privilège de table pour anon');

select tests.ok(
  not exists (select 1 from information_schema.column_privileges where grantee = 'anon' and table_schema = 'public'),
  'aucun privilège de colonne pour anon');

select tests.ok(
  not exists (
    select 1 from pg_proc p where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
      and p.prosecdef and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')),
  'toute fonction SECURITY DEFINER fixe son search_path');

select tests.ok(
  not has_function_privilege('authenticated', 'private.cle_donnees()', 'execute')
  and not has_function_privilege('anon', 'private.cle_donnees()', 'execute'),
  'la clé de chiffrement n''est pas lisible par les utilisateurs');

select tests.ok(
  not has_function_privilege('anon', 'public.annuaire()', 'execute')
  and not has_function_privilege('anon', 'public.creer_compte(jsonb, text)', 'execute')
  and not has_function_privilege('anon', 'public.fiche_lire(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.rgpd_export()', 'execute'),
  'les RPC sensibles sont fermées à anon');

select tests.ok(
  not has_column_privilege('authenticated', 'public.comptes', 'mois_offerts', 'update')
  and not has_column_privilege('authenticated', 'public.comptes', 'plan', 'update')
  and not has_column_privilege('authenticated', 'public.comptes', 'code_parrain', 'update'),
  'abonnement et parrainage non modifiables par l''utilisateur');

select tests.ok(
  not has_table_privilege('authenticated', 'public.subscriptions', 'insert')
  and not has_table_privilege('authenticated', 'public.subscriptions', 'update'),
  'les abonnements ne s''écrivent que par le webhook');

select tests.ok(
  not has_table_privilege('authenticated', 'public.fiches_tournee', 'select'),
  'pas de lecture directe des fiches de passation');

rollback;
