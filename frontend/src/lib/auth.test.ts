import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { login, logout } from "./auth";

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => value,
  });
}

function response({
  status = 200,
  redirected = false,
  url = "http://localhost/accounts/login/",
}: {
  status?: number;
  redirected?: boolean;
  url?: string;
}) {
  const result = new Response("", { status });
  Object.defineProperty(result, "redirected", { value: redirected });
  Object.defineProperty(result, "url", { value: url });
  return result;
}

beforeEach(() => {
  setCookie("csrftoken=login-token");
});

afterEach(() => {
  vi.restoreAllMocks();
  setCookie("");
});

describe("login", () => {
  it("posts form-encoded credentials with CSRF and next", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response({ redirected: true, url: "http://localhost/sources/" }));

    const redirectTo = await login({
      username: "e2e",
      password: "e2e-pass-123",
      next: "/sources/",
    });

    expect(redirectTo).toBe("/sources/");
    expect(spy.mock.calls[0][0]).toBe("/accounts/login/?next=%2Fsources%2F");
    const init = spy.mock.calls[0][1]!;
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(headers.get("X-CSRFToken")).toBe("login-token");
    expect(init.credentials).toBe("same-origin");
    const body = init.body as URLSearchParams;
    expect(body.get("username")).toBe("e2e");
    expect(body.get("password")).toBe("e2e-pass-123");
    expect(body.get("next")).toBe("/sources/");
  });

  it("defaults to / and omits CSRF when the cookie is missing", async () => {
    setCookie("");
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(response({ redirected: true, url: "http://localhost/" }));

    const redirectTo = await login({ username: "e2e", password: "secret" });

    expect(redirectTo).toBe("/");
    expect(spy.mock.calls[0][0]).toBe("/accounts/login/");
    const init = spy.mock.calls[0][1]!;
    expect(new Headers(init.headers).has("X-CSRFToken")).toBe(false);
    expect((init.body as URLSearchParams).has("next")).toBe(false);
  });

  it("reports invalid credentials when LoginView returns the form", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({}));

    await expect(
      login({ username: "e2e", password: "wrong", next: "/" }),
    ).rejects.toThrow("Please enter a correct username and password.");
  });

  it("reports expired CSRF sessions", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ status: 403 }));

    await expect(login({ username: "e2e", password: "secret" })).rejects.toThrow(
      "Your sign-in session expired. Reload and try again.",
    );
  });

  it("reports unexpected failed responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ status: 500 }));

    await expect(login({ username: "e2e", password: "secret" })).rejects.toThrow(
      "Sign in failed with HTTP 500.",
    );
  });
});

describe("logout", () => {
  it("redirects to Django's logout endpoint", () => {
    const redirect = vi.fn();

    logout(redirect);

    expect(redirect).toHaveBeenCalledWith("/accounts/logout/");
  });
});
