import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./fetcher";

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => value,
  });
}

beforeEach(() => {
  setCookie("csrftoken=test-token");
});

afterEach(() => {
  vi.restoreAllMocks();
  setCookie("");
});

function mockFetchResponse(body: unknown, init?: ResponseInit) {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

describe("apiFetch", () => {
  it("sends GET without X-CSRFToken header", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/runs/");
    const init = spy.mock.calls[0][1]!;
    const headers = new Headers(init.headers);
    expect(headers.has("X-CSRFToken")).toBe(false);
    expect(init.credentials).toBe("same-origin");
  });

  it("attaches X-CSRFToken on POST", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/runs/", { method: "POST" });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-token");
  });

  it("attaches X-CSRFToken on PUT", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/views/1/", { method: "PUT" });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-token");
  });

  it("attaches X-CSRFToken on DELETE", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/views/1/", { method: "DELETE" });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-token");
  });

  it("omits X-CSRFToken when token is null", async () => {
    setCookie("");
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/runs/", { method: "POST" });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.has("X-CSRFToken")).toBe(false);
  });

  it("parses JSON response body and returns it", async () => {
    mockFetchResponse({ hello: "world" });
    const data = await apiFetch<{ hello: string }>("/api/runs/");
    expect(data).toEqual({ hello: "world" });
  });

  it("throws on non-2xx response", async () => {
    mockFetchResponse({ detail: "nope" }, { status: 400 });
    await expect(apiFetch("/api/runs/")).rejects.toThrow(/HTTP 400/);
  });

  it("preserves caller-provided headers", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/runs/", {
      method: "POST",
      headers: { "X-Custom": "value" },
    });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.get("X-Custom")).toBe("value");
    expect(headers.get("X-CSRFToken")).toBe("test-token");
  });

  it("defaults Content-Type to application/json when body is provided", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/views/", {
      method: "POST",
      body: JSON.stringify({ name: "x" }),
    });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("returns undefined for a 204 No Content response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 204 }),
    );
    const result = await apiFetch("/api/views/1/", { method: "DELETE" });
    expect(result).toBeUndefined();
  });

  it("uses caller-provided credentials when supplied", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/api/runs/", { credentials: "include" });
    expect(spy.mock.calls[0][1]!.credentials).toBe("include");
  });

  it("does not override a caller-provided Content-Type", async () => {
    const spy = mockFetchResponse({ ok: true });
    await apiFetch("/accounts/login/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "username=a&password=b",
    });
    const headers = new Headers(spy.mock.calls[0][1]!.headers);
    expect(headers.get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );
  });
});
