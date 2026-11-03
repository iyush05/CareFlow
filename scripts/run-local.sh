#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
DOTNET_BIN="${DOTNET_BIN:-dotnet}"
if ! command -v "$DOTNET_BIN" >/dev/null 2>&1 && [ -x /tmp/careflow-dotnet/dotnet ]; then DOTNET_BIN=/tmp/careflow-dotnet/dotnet; fi
export ASPNETCORE_ENVIRONMENT=Development
export DatabaseProvider=Sqlite
export ConnectionStrings__Hospital="Data Source=careflow.db"
export ASPNETCORE_URLS="http://localhost:5080"
exec "$DOTNET_BIN" run --project src/CareFlow.Api
