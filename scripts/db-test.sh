#!/usr/bin/env bash
# Teste le schéma Supabase sur un PostgreSQL nu : migrations (deux fois, pour
# prouver qu'elles sont rejouables), seed, puis tous les tests SQL.
#
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres npm run test:db
#
# Sans DATABASE_URL, un cluster jetable est créé si les binaires PostgreSQL
# sont présents (initdb / pg_ctl).
set -euo pipefail
cd "$(dirname "$0")/.."

TMP=""
nettoyer() { if [[ -n "$TMP" ]]; then "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; fi; }
trap nettoyer EXIT

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
  [[ -x "$PGBIN/initdb" ]] || { echo "PostgreSQL introuvable : définissez DATABASE_URL ou PGBIN" >&2; exit 1; }
  TMP="$(mktemp -d)"
  RUN=()
  if [[ "$(id -u)" == "0" ]]; then chown -R postgres "$TMP"; RUN=(su postgres -c); fi
  PORT=$(( 55000 + RANDOM % 1000 ))
  if [[ ${#RUN[@]} -gt 0 ]]; then
    "${RUN[@]}" "$PGBIN/initdb -D $TMP/data -U postgres --auth=trust >/dev/null"
    "${RUN[@]}" "$PGBIN/pg_ctl -D $TMP/data -o '-p $PORT -k $TMP' -l $TMP/log -w start >/dev/null"
  else
    "$PGBIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
    "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/log" -w start >/dev/null
  fi
  DATABASE_URL="postgresql://postgres@/postgres?host=$TMP&port=$PORT"
fi

psqlx() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
export PGOPTIONS="-c client_min_messages=warning"

echo "→ environnement Supabase simulé"
psqlx -f supabase/tests/shim/supabase_shim.sql >/dev/null

for passe in 1 2; do
  echo "→ migrations (passe $passe/2)"
  for f in supabase/migrations/*.sql; do psqlx -f "$f" >/dev/null; done
done

echo "→ seed"
psqlx -f supabase/seed.sql >/dev/null

echo "→ tests"
echec=0
for t in supabase/tests/*.sql; do
  if out=$(PGOPTIONS="" psqlx -o /dev/null -f supabase/tests/shim/helpers.sql -f "$t" 2>&1); then
    n=$(grep -c 'NOTICE:  ok ' <<<"$out" || true)
    printf '  ✓ %-40s %s assertions\n' "$(basename "$t")" "$n"
  else
    echec=1
    printf '  ✗ %s\n' "$(basename "$t")"
    sed 's/^/      /' <<<"$out" | grep -v 'NOTICE:  ok ' | tail -20
  fi
  # Chaque fichier repart d'un seed propre
  psqlx -f supabase/seed.sql >/dev/null
done
exit $echec
