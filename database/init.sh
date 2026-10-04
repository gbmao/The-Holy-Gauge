#!/usr/bin/env bash
set -euo pipefail

SQLCMD=/opt/mssql-tools18/bin/sqlcmd
SQLCMD_ARGS=(-C -b -S database -U sa -P "$MSSQL_SA_PASSWORD")

"$SQLCMD" "${SQLCMD_ARGS[@]}" -i /scripts/01-database.sql
"$SQLCMD" "${SQLCMD_ARGS[@]}" -i /scripts/02-tables.sql
"$SQLCMD" "${SQLCMD_ARGS[@]}" -i /scripts/03-procedures.sql

echo "Banco HolyGauge, tabelas e procedures inicializados."
