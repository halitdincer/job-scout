import type { PropsWithChildren } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/fetcher";
import { createQueryWrapper } from "@/test/queryWrapper";

import { CURRENT_USER_QUERY_KEY, useCurrentUser } from "./auth";

afterEach(() => {
  vi.restoreAllMocks();
});

function createRetryWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: 1, retryDelay: 0 } },
  });
  return function RetryWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useCurrentUser", () => {
  it("fetches the current user from /api/v1/auth/me", async () => {
    const user = {
      id: 7,
      username: "alice",
      isStaff: false,
      isSuperuser: false,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(user), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const Wrapper = createQueryWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/v1/auth/me",
      expect.any(Object),
    );
    expect(result.current.data).toEqual(user);
  });

  it("does not retry on 401 even when the client allows retries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const Wrapper = createRetryWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 403 even when the client allows retries", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const Wrapper = createRetryWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries non-auth errors once before settling", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new TypeError("network down"));
    const Wrapper = createRetryWrapper();
    const { result } = renderHook(() => useCurrentUser(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("exposes a stable query key", () => {
    expect(CURRENT_USER_QUERY_KEY).toEqual(["auth", "me"]);
  });
});
