const LOCALHOST_API_ORIGIN = 'http://localhost:3001';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getApiBaseUrl(
  configuredApiBaseUrl?: string,
  windowOrigin?: string,
): string {
  const configured = configuredApiBaseUrl?.trim();
  if (configured) {
    return trimTrailingSlashes(configured);
  }

  const origin = windowOrigin?.trim();
  if (origin) {
    return trimTrailingSlashes(origin);
  }

  return LOCALHOST_API_ORIGIN;
}
