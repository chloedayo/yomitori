# Build & Deploy Guide

## Quick Start

```bash
# Build frontend + backend locally (verify each module)
./build.sh

# Start Docker with pre-built artifacts
docker-compose up
```

## Build Workflow

### Development Mode (Hot Reload)
Frontend runs in dev mode with hot reload:

```bash
cd frontend && npm run dev
# In another terminal:
docker-compose up backend file-server
```

### Production Build
Build everything locally, then package into Docker:

```bash
# Step 1: Build both modules
./build.sh
# Output: frontend/dist/ + build/libs/yomitori-0.1.0.jar

# Step 2: Start Docker (serves pre-built artifacts)
docker-compose up
```

## Architecture

**Old approach:** Docker builds everything
- Slow (compiles Kotlin, transpiles JS in container)
- Harder to debug
- No local verification

**New approach:** Local build, Docker packages
- Fast (just copying artifacts)
- Module-by-module verification
- Docker is pure orchestration

## File Structure

```
./build.sh                    # Master build script
frontend/
  ├── dist/                  # Built output (npm run build)
  ├── Dockerfile             # Dev mode (hot reload)
  └── Dockerfile.prod        # Prod mode (serve static)
build/libs/
  └── yomitori-0.1.0.jar    # Built backend JAR
docker-compose.yml           # Orchestration (no build steps)
Dockerfile                   # Simple artifact copy
```

## Optimization

- **Frontend**: `npm run build` (auto-increments version)
- **Backend**: `gradle bootJar` with cached gradle (~/.gradle mount)
- **Docker**: Just copies artifacts (seconds, not minutes)

## CI/CD Integration

When ready:
```yaml
# Just run the build script
script:
  - ./build.sh
  - docker-compose build
  - docker-compose push
```

No Docker build time—artifacts already verified locally.
