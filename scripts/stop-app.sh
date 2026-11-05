#!/bin/bash
# Stop only this checkout's listener on its registered local port.
set -euo pipefail

port=4107
app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../app" && pwd -P)"

if ! command -v lsof >/dev/null 2>&1; then
  echo "Cannot stop the app: lsof is required." >&2
  exit 1
fi

pids="$(lsof -nP -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
if [ -z "$pids" ]; then
  echo "SJB Writer fork is already stopped."
  exit 0
fi

# Check every listener before sending any signals.
for pid in $pids; do
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
  if [ "$cwd" != "$app_dir" ]; then
    echo "Port $port belongs to another process (PID $pid). Nothing was stopped." >&2
    exit 1
  fi
done

for pid in $pids; do
  kill -TERM "$pid"
done
echo "Sent stop to SJB Writer fork on port $port."
