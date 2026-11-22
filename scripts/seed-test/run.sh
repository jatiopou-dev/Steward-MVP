#!/usr/bin/env bash
# Seed a TEST database with fictional donations and bank lines.
#
#   ./run.sh                 Fresh throwaway Postgres in Docker: auth stub,
#                            supabase/schema.sql, all migrations, seed, verify.
#   ./run.sh --existing      Seed + verify an existing LOCAL test database whose
#                            schema is already applied. Needs SEED_TEST_DATABASE_URL.
#   ./run.sh --down          Remove the throwaway container.
#
# Never touches production: --existing only accepts localhost URLs and always
# refuses the project linked in supabase/.temp.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
OUT_DIR="$HERE/out"
PG_IMAGE="${SEED_TEST_PG_IMAGE:-postgres:17}"
CONTAINER="${SEED_TEST_CONTAINER:-steward-seed-test}"
PORT="${SEED_TEST_PG_PORT:-54329}"
MODE="${1:-fresh}"

die() { echo "error: $*" >&2; exit 1; }
command -v node >/dev/null || die "node is required"
command -v docker >/dev/null || die "docker is required"

container_psql() { docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"; }

url_psql() {
  if command -v psql >/dev/null; then
    env -u PGHOST -u PGHOSTADDR -u PGSERVICE -u PGSERVICEFILE \
      psql -q -v ON_ERROR_STOP=1 "$SEED_TEST_DATABASE_URL" "$@"
  else
    docker run --rm -i --network host "$PG_IMAGE" psql -q -v ON_ERROR_STOP=1 "$SEED_TEST_DATABASE_URL" "$@"
  fi
}

guard_url() {
  local url="$1" host linked_ref=""
  [[ -f "$REPO_ROOT/supabase/.temp/project-ref" ]] && linked_ref="$(tr -d '[:space:]' < "$REPO_ROOT/supabase/.temp/project-ref")"
  if [[ -n "$linked_ref" && "$url" == *"$linked_ref"* ]]; then
    die "refusing: URL points at the linked Supabase project ($linked_ref)"
  fi
  [[ "$url" =~ ^postgres(ql)?:// ]] || die "refusing: SEED_TEST_DATABASE_URL must be a postgres:// or postgresql:// URL"
  # Query parameters such as host= or hostaddr= can redirect libpq elsewhere; allow only harmless ones.
  if [[ "$url" == *\?* ]]; then
    local param
    IFS='&' read -ra params <<<"${url#*\?}"
    for param in "${params[@]}"; do
      case "${param%%=*}" in
        sslmode|connect_timeout|application_name) ;;
        *) die "refusing: query parameter '${param%%=*}' is not allowed" ;;
      esac
    done
  fi
  [[ "$url" =~ supabase\.(co|com) ]] && die "refusing: hosted Supabase URLs are not allowed; use a local test database"
  host="$(sed -E 's#^[a-z]+://([^@/]*@)?(\[[^]]*\]|[^:/?,]*).*#\2#' <<<"$url")"
  [[ "$(sed -E 's#^[a-z]+://([^/?]*).*#\1#' <<<"$url")" == *,* ]] && die "refusing: multi-host URLs are not allowed"
  case "$host" in
    localhost|127.0.0.1|"[::1]"|host.docker.internal) ;;
    *) die "refusing: host '$host' is not local (allowed: localhost, 127.0.0.1, [::1], host.docker.internal)" ;;
  esac
}

case "$MODE" in
  --down)
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    echo "Removed $CONTAINER"
    exit 0
    ;;
  fresh|--fresh)
    echo "==> Starting fresh Postgres ($PG_IMAGE) as $CONTAINER on port $PORT"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -p "127.0.0.1:$PORT:5432" "$PG_IMAGE" >/dev/null
    for _ in $(seq 1 60); do
      docker exec "$CONTAINER" pg_isready -U postgres -q 2>/dev/null && break
      sleep 1
    done
    # pg_isready can succeed during the image's init restart; confirm a real query works.
    for _ in $(seq 1 30); do container_psql -c 'select 1' >/dev/null 2>&1 && break; sleep 1; done

    echo "==> Applying auth stub, schema.sql and migrations"
    container_psql < "$HERE/sql/auth_stub.sql"
    container_psql < "$REPO_ROOT/supabase/schema.sql"
    for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
      echo "    $(basename "$f")"
      container_psql < "$f"
    done
    RUN_PSQL=container_psql
    ;;
  --existing)
    [[ -n "${SEED_TEST_DATABASE_URL:-}" ]] || die "set SEED_TEST_DATABASE_URL to a local test database"
    guard_url "$SEED_TEST_DATABASE_URL"
    RUN_PSQL=url_psql
    ;;
  *) die "unknown option '$MODE' (use --existing or --down)" ;;
esac

echo "==> Generating fictional data"
node "$HERE/generate.mjs" --out="$OUT_DIR" ${SEED_TEST_SEED:+--seed="$SEED_TEST_SEED"}

echo "==> Loading seed"
$RUN_PSQL < "$OUT_DIR/seed.sql"

echo "==> Verifying against expected matches"
$RUN_PSQL < "$HERE/sql/verify.sql"

echo "==> Checking match-decision rules"
$RUN_PSQL < "$HERE/sql/matching_checks.sql"

echo "==> Done. Answer key: $OUT_DIR/expected_matches.csv"
[[ "$MODE" == --existing ]] || echo "    Connect: postgresql://postgres:postgres@127.0.0.1:$PORT/postgres  (remove with ./run.sh --down)"
