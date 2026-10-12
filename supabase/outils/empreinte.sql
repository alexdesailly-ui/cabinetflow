-- Empreinte de la structure applicative d'une base : fonctions, politiques, colonnes, contraintes,
-- déclencheurs, index, RLS et droits, regroupés par catégorie.
--
-- Servez-vous-en pour comparer deux bases (par exemple le projet Supabase et une base locale
-- construite depuis supabase/migrations) : si une catégorie a la même empreinte des deux côtés,
-- elle est identique. Les espaces ne comptent pas. Lecture seule.
--   psql "$DATABASE_URL" -f supabase/outils/empreinte.sql      ou  SQL Editor de Supabase

with
f as (
  select 'fonction' as cat,
         n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as obj,
         md5(regexp_replace(p.prosrc, '\s', '', 'g')) || ' def=' || p.prosecdef::int || ' vol=' || p.provolatile::text || ' cfg=' || coalesce(array_to_string(p.proconfig, ','), '')
         || ' pub=' || exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0)::int
         || ' anon=' || has_function_privilege('anon', p.oid, 'execute')::int
         || ' auth=' || has_function_privilege('authenticated', p.oid, 'execute')::int
         || ' svc=' || has_function_privilege('service_role', p.oid, 'execute')::int as h
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
),
pol as (
  select 'politique', tablename || '.' || policyname,
         cmd || ' roles=' || array_to_string(roles, ',') || ' ' || md5(coalesce(qual, '') || '|' || coalesce(with_check, ''))
  from pg_policies where schemaname = 'public'
),
col as (
  select 'colonne', table_name || '.' || column_name,
         data_type || ' null=' || is_nullable || ' def=' || md5(coalesce(column_default, '')) || ' gen=' || is_generated
  from information_schema.columns where table_schema in ('public', 'private')
),
con as (
  select 'contrainte', conrelid::regclass::text || '.' || conname, md5(pg_get_constraintdef(oid))
  from pg_constraint where connamespace in ('public'::regnamespace, 'private'::regnamespace)
),
trg as (
  select 'declencheur', tgrelid::regclass::text || '.' || tgname, md5(pg_get_triggerdef(oid))
  from pg_trigger where not tgisinternal and tgrelid::regclass::text ~ '^(public|private)?\.?[a-z_]+$' and tgrelid in (select oid from pg_class where relnamespace in ('public'::regnamespace, 'private'::regnamespace))
),
idx as (
  select 'index', schemaname || '.' || indexname, md5(indexdef) from pg_indexes where schemaname in ('public', 'private')
),
rls as (
  select 'rls', relname, 'rls=' || relrowsecurity::int || ' force=' || relforcerowsecurity::int
  from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'
),
gr as (
  select 'droit_colonne', table_name || '.' || column_name || ':' || grantee, string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, column_name, grantee
),
gt as (
  select 'droit_table', table_name || ':' || grantee, string_agg(privilege_type, ',' order by privilege_type)
  from information_schema.table_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
  group by table_name, grantee
)
select cat, count(*) as n, md5(string_agg(obj || '=' || h, E'\n' order by obj)) as empreinte
from (select * from f union all select * from pol union all select * from col union all select * from con union all select * from trg
      union all select * from idx union all select * from rls union all select * from gr union all select * from gt) t(cat, obj, h)
group by cat order by cat;
