#!/bin/sh
# Yalnızca yerel replica testi: ilk açılışta primary'den taban yedek alır, sonra standby olarak başlar. Çakışma testinin tetiklenmesi
# için standby gecikmesi kısa tutulur (sabit varsayılan, ortam değişkeni yok).
set -e
export PGPASSWORD=local_admin_password
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"
  chmod 700 "$PGDATA"
  su-exec postgres pg_basebackup -h postgres-rp -U admin -D "$PGDATA" -R -X stream
fi
exec docker-entrypoint.sh postgres -c hot_standby=on -c max_standby_streaming_delay=1s -c hot_standby_feedback=off
