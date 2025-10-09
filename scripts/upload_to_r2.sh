#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/upload_to_r2.sh <local_artifacts_dir> <bucket> <endpoint> <prefix> [channel]
# Example: ./scripts/upload_to_r2.sh ./artifacts my-bucket https://<account_id>.r2.cloudflarestorage.com releases-v2 stable

LOCAL_DIR=${1:-./artifacts}
BUCKET=${2:-$R2_BUCKET}
ENDPOINT=${3:-$R2_ENDPOINT}
PREFIX=${4:-releases-v2}
CHANNEL=${5:-stable}

if [ -z "$BUCKET" ] || [ -z "$ENDPOINT" ]; then
  echo "BUCKET and ENDPOINT must be provided either as args or env vars (R2_BUCKET, R2_ENDPOINT)"
  exit 1
fi

DEST="s3://${BUCKET}/${PREFIX}/${CHANNEL}/"

echo "Syncing $LOCAL_DIR -> $DEST via endpoint $ENDPOINT"
aws --endpoint-url "$ENDPOINT" s3 sync "$LOCAL_DIR" "$DEST" --exact-timestamps

echo "Upload complete. Public URL base (if you have a Worker or custom domain):"
echo "https://<your-cdn-domain>/${PREFIX}/${CHANNEL}/"
