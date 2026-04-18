#!/bin/bash

# Docker Build Optimizations Setup
# Enables BuildKit, gradle caching, and parallel builds

echo "🐳 Setting up Docker optimizations..."

# Enable BuildKit
export DOCKER_BUILDKIT=1
echo "✓ BuildKit enabled (DOCKER_BUILDKIT=1)"

# Ensure gradle cache directory exists locally
mkdir -p ~/.gradle
echo "✓ Local gradle cache at ~/.gradle (will be mounted in container)"

# Summary
echo ""
echo "Optimizations enabled:"
echo "  1. BuildKit for efficient layer caching"
echo "  2. Dockerfile BuildKit cache mounts (--mount=type=cache)"
echo "  3. Gradle parallel builds (-Dorg.gradle.parallel=true)"
echo "  4. Gradle build cache flag (--build-cache)"
echo "  5. Separate dependency/source layers"
echo ""
echo "Usage:"
echo "  export DOCKER_BUILDKIT=1"
echo "  docker-compose build backend"
echo ""
echo "First build: ~5-8min (downloads deps)"
echo "Subsequent: ~2-3min (cached deps)"
