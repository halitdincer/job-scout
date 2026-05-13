import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createQueryWrapper } from "@/test/queryWrapper";

import { useSources } from "./sources";

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

describe("useSources", () => {
  it("fetches /api/sources/ and returns the parsed list", async () => {
    const spy = mockOk([
      {
        id: 1,
        name: "E2E Source",
        platform: "greenhouse",
        board_id: "e2e-board",
        is_active: true,
      },
    ]);

    const { result } = renderHook(() => useSources(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy.mock.calls[0][0]).toBe("/api/sources/");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("E2E Source");
  });

  it("surfaces fetch errors via isError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("oops", { status: 500 }),
    );

    const { result } = renderHook(() => useSources(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
