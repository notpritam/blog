#!/usr/bin/env bash
# Idempotently add blog.notpritam.in to the SHARED /etc/caddy/Caddyfile.
#
# The shared Caddyfile has silently lost a different project's host before (see
# ~/personal/CLAUDE.md, "Something rewrites /etc/caddy/Caddyfile"). So this script:
#   1. backs up the Caddyfile with a timestamp (the existing recovery convention),
#   2. appends the blog block only if it is not already present,
#   3. verifies EVERY other project's host is still in the file (aborts + restores
#      if any went missing),
#   4. validates the config and reloads Caddy.
#
# Run with sudo. Safe to run repeatedly.
set -euo pipefail

CADDYFILE=/etc/caddy/Caddyfile
SNIPPET="$(cd "$(dirname "$0")" && pwd)/caddy/blog.caddy"
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP="${CADDYFILE}.bak.${STAMP}"

# Every host that MUST remain in the file (per ~/personal/CLAUDE.md hosting table),
# plus the one we are adding.
EXPECTED_HOSTS=(
  atlas.notpritam.in
  mailroom.notpritam.in
  cutroom.notpritam.in
  app.cutroom.notpritam.in
  studio.cutroom.notpritam.in
  voice.notpritam.in
  rig.notpritam.in
  train.notpritam.in
  blog.notpritam.in
)

[[ $EUID -eq 0 ]] || { echo "run with sudo"; exit 1; }
[[ -f "$CADDYFILE" ]] || { echo "no $CADDYFILE"; exit 1; }
[[ -f "$SNIPPET" ]] || { echo "no snippet at $SNIPPET"; exit 1; }

echo "Backing up -> $BACKUP"
cp "$CADDYFILE" "$BACKUP"

if grep -qE '^blog\.notpritam\.in *\{' "$CADDYFILE"; then
  echo "blog.notpritam.in already present; not appending."
else
  echo "Appending blog block from $SNIPPET"
  printf '\n' >> "$CADDYFILE"
  cat "$SNIPPET" >> "$CADDYFILE"
fi

missing=0
for host in "${EXPECTED_HOSTS[@]}"; do
  if ! grep -qE "^${host//./\\.} *\{" "$CADDYFILE"; then
    echo "!! MISSING after edit: $host"
    missing=1
  fi
done
if [[ $missing -ne 0 ]]; then
  echo "Aborting: a host went missing. Restoring backup."
  cp "$BACKUP" "$CADDYFILE"
  exit 1
fi

echo "Validating..."
caddy validate --config "$CADDYFILE" --adapter caddyfile
echo "Reloading..."
systemctl reload caddy
echo "Done. Hosts now in the file:"
grep -oE '^[a-z0-9.-]+\.(in|app|com) *\{' "$CADDYFILE" | tr -d '{ ' | tr '\n' ' '; echo
