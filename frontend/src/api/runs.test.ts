import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { useRuns } from "./runs";
import { createQueryWrapper } from "@/test/queryWrapper";

function mockOk(body: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRuns", () => {
  it("fetches /api/runs/ and returns the parsed list", async () => {
    const spy = mockOk([
      {
        id: 1,
        status: "completed",
        started_at: null,
        finished_at: null,
        sources_processed: 0,
        listings_created: 0,
        listings_updated: 0,
        listings_expired: 0,
        error_message: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ]);

    const { result } = renderHook(() => useRuns(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy.mock.calls[0][0]).toBe("/api/runs/");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].status).toBe("completed");
  });

  it("surfaces fetch errors via isError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("oops", { status: 500 }),
    );
    const { result } = renderHook(() => useRuns(), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
