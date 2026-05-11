export function getSafeReturnTo(value: string | null): string {
  if (value === null || !value.startsWith('/') || value.includes('\\')) {
    return '/';
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return '/';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}
