-- Outils de test : assertions et changement d'identité (comme un appel PostgREST).
\set QUIET on
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.ok(condition boolean, description text) returns void language plpgsql as $$
begin
  if condition is not true then raise exception 'ÉCHEC : %', description; end if;
  raise notice 'ok %', description;
end $$;

create or replace function tests.egal(obtenu anyelement, attendu anyelement, description text) returns void language plpgsql as $$
begin
  if obtenu is distinct from attendu then
    raise exception 'ÉCHEC : % (obtenu %, attendu %)', description, obtenu, attendu;
  end if;
  raise notice 'ok %', description;
end $$;

/** Vérifie qu'une instruction échoue ; `attendu` (facultatif) doit figurer dans le message d'erreur. */
create or replace function tests.refuse(instruction text, description text, attendu text default null) returns void language plpgsql as $$
begin
  begin
    execute instruction;
  exception when others then
    if attendu is not null and sqlerrm not ilike '%' || attendu || '%' then
      raise exception 'ÉCHEC (mauvaise raison) : % — obtenu « % »', description, sqlerrm;
    end if;
    raise notice 'ok %', description;
    return;
  end;
  raise exception 'ÉCHEC (aurait dû être refusé) : %', description;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

/** Se connecter comme un utilisateur de démonstration (n° de suffixe d'UUID). */
create or replace function tests.uid(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-a000-' || lpad(n::text, 12, '0'))::uuid
$$;
grant execute on function tests.uid(int) to anon, authenticated;

/** tests.connecter(1) = Marie ; 11 = Julien ; null = anonyme. Effet limité à la transaction. */
create or replace function tests.connecter(n int) returns void language plpgsql as $$
begin
  reset role;
  if n is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims', json_build_object('sub', tests.uid(n), 'role', 'authenticated')::text, true);
    set local role authenticated;
  end if;
end $$;
create or replace function tests.systeme() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;
grant execute on all functions in schema tests to anon, authenticated;
\set QUIET off
