#!/usr/bin/env bash
# Sidecar launcher for the Spring Boot backend.
# Tauri sets RESOURCE_DIR to the directory containing bundled resources.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# In a Tauri bundle, resources land next to the sidecar binary.
RESOURCE_DIR="${RESOURCE_DIR:-$SCRIPT_DIR}"

JRE="$RESOURCE_DIR/jre"
JAR="$RESOURCE_DIR/yomitori.jar"

if [ ! -d "$JRE" ]; then
    echo "ERROR: bundled JRE not found at $JRE" >&2
    exit 1
fi

if [ ! -f "$JAR" ]; then
    echo "ERROR: yomitori.jar not found at $JAR" >&2
    exit 1
fi

exec "$JRE/bin/java" \
    -XX:+UseSerialGC \
    -Xmx1g \
    -jar "$JAR" \
    "$@"
