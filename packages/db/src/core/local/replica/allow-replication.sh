#!/bin/sh
# Yalnızca yerel replica testi: replica konteyneri primary'den pg_basebackup alabilsin.
echo "host replication all all scram-sha-256" >> "$PGDATA/pg_hba.conf"
