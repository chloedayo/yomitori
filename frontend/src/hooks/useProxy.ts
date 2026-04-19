export function useProxy(path: string, baseUrl?: string): string {
  const url = baseUrl || import.meta.env.VITE_BACKEND_URL;

  if (url) {
    return `${url}${path}`;
  }
  return path;
}

export function useMiddlewareProxy(path: string): string {
  const middlewareUrl = import.meta.env.VITE_MIDDLEWARE_URL;

  if (middlewareUrl) {
    return `${middlewareUrl}${path}`;
  }
  return path;
}
