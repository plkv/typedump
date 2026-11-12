#!/bin/sh
# Hands the Cloudflare API token for the daily Foundries workflow to GitHub,
# from a local file and without printing it. The file's header says where to
# make the token; it must belong to the account typedump's Pages project lives
# in, with Cloudflare Pages · Edit.
#
#   sh scripts/foundries/set-ci-token.sh
set -eu
FILE="$HOME/.cloudflare/typedump-ci.env"
TOKEN=$(sed -n 's/^CLOUDFLARE_API_TOKEN=//p' "$FILE")
[ -n "$TOKEN" ] || { echo "No token in $FILE"; exit 1; }
printf '%s' "$TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R plkv/typedump
echo "CLOUDFLARE_API_TOKEN set on plkv/typedump"
