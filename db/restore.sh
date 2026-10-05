#!/bin/bash
# Se ejecuta automaticamente solo la primera vez (volumen vacio).
set -e
pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges /backup/backup_db
