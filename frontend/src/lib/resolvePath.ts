// Same-origin architecture: middleware serves the SPA and proxies /api/*
// and middleware-native routes. Frontend always uses relative paths.
// These are plain pass-through helpers (not React hooks) — renamed from
// useProxy/useMiddlewareProxy to avoid the react-hooks/rules-of-hooks
// landmine (identifiers matching /^use[A-Z]/ are treated as hooks).

export function resolvePath(path: string): string {
  return path;
}

export function resolveMiddlewarePath(path: string): string {
  return path;
}
