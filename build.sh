#!/bin/bash

set -e

# Ensure gradle is in PATH
export PATH="$HOME/.local/opt/gradle-8.4/bin:$PATH"

echo "🔨 Building Yomitori (frontend + backend + middleware)..."
echo ""

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..
echo "✓ Frontend built to frontend/dist"
echo ""

# Build middleware
echo "⚙️  Building middleware..."
cd middleware
npm install --legacy-peer-deps
npm run build
cd ..
echo "✓ Middleware built to middleware/dist"
echo ""

# Build backend (locally)
echo "🏗️  Building backend (local gradle)..."
mkdir -p build/libs
gradle bootJar -x test --build-cache -Dorg.gradle.parallel=true -Dorg.gradle.workers.max=4
echo "✓ Backend built to build/libs/"
echo ""

# Summary
echo "✅ All artifacts ready:"
echo "   - frontend/dist/"
echo "   - middleware/dist/"
echo "   - build/libs/yomitori-0.1.0.jar"
echo ""
echo "Next: docker-compose up"
