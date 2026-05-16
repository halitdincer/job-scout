import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueryWrapper } from "@/test/queryWrapper";

import { buildFacetsUrl, useJobFacets } from "./facets";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildFacetsUrl", () => {
  it("joins fields into a comma-separated query param", () => {
    expect(buildFacetsUrl(["source_name", "country"])).toBe(
      "/api/jobs/facets/?fields=source_name%2Ccountry",
    );
  });
});

describe("useJobFacets", () => {
  it("fetches facets with the default field set", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            source_name: ["Acme"],
            country: ["CA"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    const Wrapper = createQueryWrapper();
    const { result } = renderHook(() => useJobFacets(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/jobs/facets/?fields="),
      expect.any(Object),
    );
    expect(result.current.data).toEqual({
      source_name: ["Acme"],
      country: ["CA"],
    });
  });

  it("uses an explicit field set when supplied", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ status: ["active"] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const Wrapper = createQueryWrapper();
    const { result } = renderHook(() => useJobFacets(["status"]), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("fields=status");
    expect(url).not.toContain("source_name");
  });
});
