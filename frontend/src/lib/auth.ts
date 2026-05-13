import { getCsrfToken } from "./csrf";

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginError";
  }
}

export type LoginInput = {
  username: string;
  password: string;
  next?: string;
};

/* v8 ignore start -- unit tests inject redirect callbacks; browser navigation is covered by Playwright. */
function browserRedirect(url: string) {
  window.location.assign(url);
}
/* v8 ignore stop */

function buildLoginUrl(next?: string) {
  if (!next) {
    return "/accounts/login/";
  }
  const params = new URLSearchParams({ next });
  return `/accounts/login/?${params.toString()}`;
}

export async function login({ username, password, next }: LoginInput) {
  const body = new URLSearchParams({ username, password });
  if (next) {
    body.set("next", next);
  }

  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded",
  });
  const token = getCsrfToken();
  if (token) {
    headers.set("X-CSRFToken", token);
  }

  const response = await fetch(buildLoginUrl(next), {
    method: "POST",
    headers,
    body,
    credentials: "same-origin",
  });

  if (response.status === 403) {
    throw new LoginError("Your sign-in session expired. Reload and try again.");
  }
  if (!response.ok) {
    throw new LoginError(`Sign in failed with HTTP ${response.status}.`);
  }
  if (response.redirected) {
    return next ?? "/";
  }

  throw new LoginError("Please enter a correct username and password.");
}

export function logout(
  redirect: (url: string) => void = browserRedirect,
) {
  redirect("/accounts/logout/");
}
