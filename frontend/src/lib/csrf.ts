/**
 * Read Django's csrftoken cookie. Returns null if absent so callers can
 * skip injecting the header on requests that don't need it (e.g. GETs,
 * cross-origin pings).
 */
export function getCsrfToken(): string | null {
  const cookie = document.cookie;
  if (!cookie) {
    return null;
  }
  for (const part of cookie.split(";")) {
    const [rawName, ...rawRest] = part.split("=");
    if (rawName.trim() === "csrftoken") {
      const value = rawRest.join("=").trim();
      return decodeURIComponent(value);
    }
  }
  return null;
}
