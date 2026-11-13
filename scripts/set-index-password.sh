#!/bin/sh
# Puts the password for /list (functions/list.ts) into the Cloudflare Pages
# project as the INDEX_PASSWORD secret. The value lives in a file outside the
# repository and never passes through a terminal or a chat.
#
#   sh scripts/set-index-password.sh
set -e
FILE="$HOME/.typedump/index-password"
VALUE=$(sed -n 's/^INDEX_PASSWORD=//p' "$FILE")
if [ -z "$VALUE" ]; then
  echo "No password in $FILE yet" >&2
  exit 1
fi
printf '%s' "$VALUE" | npx wrangler pages secret put INDEX_PASSWORD --project-name typedump
