#!/usr/bin/env bash
# Build script for the Tauri desktop app.
# Requires: JDK 21+, bun, npm, gradle (or uses gradle wrapper if present)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER="$REPO_ROOT/launcher"
BINARIES="$LAUNCHER/binaries"
RESOURCES="$LAUNCHER/resources"

TARGET_TRIPLE="${TARGET_TRIPLE:-$(rustc -vV | awk '/host:/{print $2}')}"

echo "==> Building Yomitori desktop for $TARGET_TRIPLE"

# ---------------------------------------------------------------------------
# 1. Frontend
# ---------------------------------------------------------------------------
echo ""
echo "[1/5] Building frontend..."
cd "$REPO_ROOT/frontend"
VITE_MIDDLEWARE_URL=http://localhost:3000 npm run build
echo "    frontend/dist ready"

# ---------------------------------------------------------------------------
# 2. Backend JAR
# ---------------------------------------------------------------------------
echo ""
echo "[2/5] Building backend JAR..."
cd "$REPO_ROOT"
GRADLE="${GRADLE_HOME:+$GRADLE_HOME/bin/}gradle"
if [ -f "./gradlew" ]; then GRADLE="./gradlew"; fi
$GRADLE bootJar -x test --build-cache
JAR="$(ls "$REPO_ROOT/build/libs/"*-[0-9]*.jar | grep -v plain | head -1)"
echo "    JAR: $JAR"

# ---------------------------------------------------------------------------
# 3. jlink minimal JRE
# ---------------------------------------------------------------------------
echo ""
echo "[3/5] Creating minimal JRE with jlink..."
rm -rf "$RESOURCES/jre"
MODULES="$(java -jar "$JAR" --list-modules 2>/dev/null \
    | tr ',' '\n' | tr -d ' ' | paste -sd ',' -)" || true

if [ -z "$MODULES" ]; then
    # Fallback: derive modules from jdeps
    MODULES="$(jdeps \
        --multi-release 21 \
        --ignore-missing-deps \
        --print-module-deps \
        "$JAR" 2>/dev/null || echo "java.base,java.sql,java.net.http")"
fi

jlink \
    --no-header-files \
    --no-man-pages \
    --compress=2 \
    --strip-debug \
    --add-modules "$MODULES" \
    --output "$RESOURCES/jre"
echo "    JRE size: $(du -sh "$RESOURCES/jre" | cut -f1)"

# ---------------------------------------------------------------------------
# 4. Bundle backend JAR + compile middleware binary
# ---------------------------------------------------------------------------
echo ""
echo "[4/5] Preparing sidecars..."

# Copy JAR to resources
cp "$JAR" "$RESOURCES/yomitori.jar"

# Compile middleware to self-contained binary with bun
cd "$REPO_ROOT/middleware"
npm install --legacy-peer-deps
npm run build
bun build \
    --compile \
    --target=bun \
    --outfile "$BINARIES/yomitori-middleware-$TARGET_TRIPLE" \
    dist/server.js
echo "    middleware binary: $(du -sh "$BINARIES/yomitori-middleware-$TARGET_TRIPLE" | cut -f1)"

# Copy backend launcher script as sidecar binary
cd "$REPO_ROOT"
if [[ "$TARGET_TRIPLE" == *"windows"* ]]; then
    cp scripts/yomitori-backend.bat "$BINARIES/yomitori-backend-$TARGET_TRIPLE"
else
    cp scripts/yomitori-backend.sh "$BINARIES/yomitori-backend-$TARGET_TRIPLE"
    chmod +x "$BINARIES/yomitori-backend-$TARGET_TRIPLE"
fi
echo "    backend shim: $BINARIES/yomitori-backend-$TARGET_TRIPLE"

# ---------------------------------------------------------------------------
# 5. Tauri build
# ---------------------------------------------------------------------------
echo ""
echo "[5/5] Building Tauri desktop app..."
cd "$LAUNCHER"
npm run tauri build 2>/dev/null || ~/.local/bin/tauri build

echo ""
echo "Done. Artifacts in launcher/target/release/bundle/"
