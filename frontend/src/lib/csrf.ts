/**
 * Read Spring Security's CSRF cookie. The backend keeps Django-compatible
 * cookie/header names so existing unsafe request helpers can keep using
 * X-CSRFToken.
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
