import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createQueryWrapper } from "@/test/queryWrapper";

import { useJobs } from "./jobs";

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

describe("useJobs", () => {
  it("fetches the jobs envelope with sort and pagination params", async () => {
    const spy = mockOk({
      results: [],
      count: 0,
      page: 2,
      page_size: 100,
      total_pages: 0,
      sort: [{ field: "title", dir: "asc" }],
    });

    const { result } = renderHook(
      () =>
        useJobs({
          page: 2,
          pageSize: 100,
          sort: [{ field: "title", dir: "asc" }],
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy.mock.calls[0][0]).toBe(
      "/api/jobs/?sort=title%3Aasc&page=2&page_size=100",
    );
  });

  it("includes a JSON-stringified filter param when filter is provided", async () => {
    const spy = mockOk({
      results: [],
      count: 0,
      page: 1,
      page_size: 50,
      total_pages: 0,
      sort: [],
    });

    const filter = { field: "title", operator: "contains", value: "engineer" };
    renderHook(
      () =>
        useJobs({
          page: 1,
          pageSize: 50,
          sort: [],
          filter,
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const calledUrl = spy.mock.calls[0][0] as string;
    expect(calledUrl).toContain(
      `filter=${encodeURIComponent(JSON.stringify(filter))}`,
    );
  });

  it("omits the filter param when filter is null", async () => {
    const spy = mockOk({
      results: [],
      count: 0,
      page: 1,
      page_size: 50,
      total_pages: 0,
      sort: [],
    });

    renderHook(
      () =>
        useJobs({
          page: 1,
          pageSize: 50,
          sort: [],
          filter: null,
        }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const calledUrl = spy.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("filter=");
  });

  it("surfaces fetch errors via isError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("oops", { status: 500 }),
    );

    const { result } = renderHook(
      () => useJobs({ page: 1, pageSize: 50, sort: [] }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
