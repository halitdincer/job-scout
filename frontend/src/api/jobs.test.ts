import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import { createQueryWrapper } from "@/test/queryWrapper";

import { markJobSeen, useJobs } from "./jobs";

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
  document.cookie =
    "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
      "/api/v1/jobs?sort=title%3Aasc&page=1&pageSize=100",
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
    const backendFilter = { field: "title", op: "contains", value: "engineer" };
    expect(calledUrl).toContain(
      `filter=${encodeURIComponent(JSON.stringify(backendFilter))}`,
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

  it("maps the Spring jobs page response into the UI envelope", async () => {
    mockOk({
      items: [
        {
          id: 1,
          sourceId: 2,
          sourceName: "Acme",
          externalId: "ext-1",
          title: "Engineer",
          locations: [
            {
              id: 3,
              name: "Toronto",
              countryCode: "CA",
              regionCode: "ON",
              city: "Toronto",
              geoKey: "ca-on-toronto",
            },
            { id: 4, name: "Remote" },
          ],
          url: "https://example.test/jobs/1",
          status: "ACTIVE",
          expiredAt: "2025-06-01T00:00:00Z",
          publishedAt: "2025-05-01T00:00:00Z",
          updatedAtSource: "2025-05-02T00:00:00Z",
          firstSeenAt: "2025-05-03T00:00:00Z",
          lastSeenAt: "2025-05-04T00:00:00Z",
          seen: false,
        },
        {
          id: 5,
          sourceId: 6,
          sourceName: "Beta",
          externalId: "ext-5",
          title: "Analyst",
          url: "https://example.test/jobs/5",
          status: "EXPIRED",
          firstSeenAt: "2025-05-05T00:00:00Z",
          lastSeenAt: "2025-05-06T00:00:00Z",
          seen: true,
        },
      ],
      total: 3,
      page: 0,
      pageSize: 2,
    });

    const sort = [{ field: "title", dir: "asc" as const }];
    const { result } = renderHook(
      () => useJobs({ page: 1, pageSize: 2, sort }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      results: [
        expect.objectContaining({
          id: 1,
          source_id: 2,
          source_name: "Acme",
          external_id: "ext-1",
          title: "Engineer",
          country: ["CA"],
          region: ["ON"],
          city: ["Toronto"],
          expired_at: "2025-06-01T00:00:00Z",
          published_at: "2025-05-01T00:00:00Z",
          updated_at_source: "2025-05-02T00:00:00Z",
          first_seen_at: "2025-05-03T00:00:00Z",
          last_seen_at: "2025-05-04T00:00:00Z",
          seen: false,
        }),
        expect.objectContaining({
          id: 5,
          locations: [],
          expired_at: null,
          published_at: null,
          updated_at_source: null,
          seen: true,
        }),
      ],
      count: 3,
      page: 1,
      page_size: 2,
      total_pages: 2,
      sort,
    });
    expect(result.current.data?.results[0].locations[1]).toEqual({
      id: 4,
      name: "Remote",
      country_code: "",
      region_code: "",
      city: "",
      geo_key: "",
    });
  });

  it("defaults missing Spring page metadata", async () => {
    mockOk({});

    const { result } = renderHook(
      () => useJobs({ page: 1, pageSize: 50, sort: [] }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      count: 0,
      page: 1,
      page_size: 50,
      total_pages: 0,
    });
  });

  it("handles a Spring response with zero page size", async () => {
    mockOk({ items: [], total: 10, page: 0, pageSize: 0 });

    const { result } = renderHook(
      () => useJobs({ page: 1, pageSize: 50, sort: [] }),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_pages).toBe(0);
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

  it("marks a job as seen with a keepalive POST", async () => {
    document.cookie = "csrftoken=seen-token; path=/";
    const spy = mockOk({ listing_id: 42, seen: true, created: true });

    const result = await markJobSeen(42);

    expect(result).toEqual({ listing_id: 42, seen: true, created: true });
    expect(spy.mock.calls[0][0]).toBe("/api/v1/jobs/42/seen");
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.keepalive).toBe(true);
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).get("X-CSRFToken")).toBe("seen-token");
  });

  it("maps the Spring mark-seen response", async () => {
    const spy = mockOk({ id: 42, seen: true });

    const result = await markJobSeen(42);

    expect(result).toEqual({ listing_id: 42, seen: true, created: false });
    expect(spy.mock.calls[0][0]).toBe("/api/v1/jobs/42/seen");
  });
});
