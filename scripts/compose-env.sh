#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Khong tim thay file .env. Hay tao tu .env.example truoc khi chay." >&2
  exit 1
fi

# Docker Compose uu tien bien da export trong shell hon file .env. Xoa cac bien
# cau hinh cua du an khoi process con de mot lan deploy luon dung dung .env.
unset POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD DATABASE_URL
unset BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_PASSWORD BOOTSTRAP_ADMIN_NAME
unset BOOTSTRAP_SETUP_TOKEN APP_SECRET PATIENT_NOTE_IP_SALT AUTH_RATE_LIMIT_SALT

exec docker compose --env-file .env "$@"
