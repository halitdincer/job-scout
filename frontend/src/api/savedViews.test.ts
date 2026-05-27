import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

import {
  SAVED_VIEWS_QUERY_KEY,
  useCreateSavedView,
  useDeleteSavedView,
  useSavedViews,
  useUpdateSavedView,
} from "./savedViews";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { SavedView, SavedViewPayload } from "@/types/api";

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

function seedCsrfCookie() {
  document.cookie = "csrftoken=test-csrf-token; path=/";
}

function clearCsrfCookie() {
  document.cookie = "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

const SAMPLE_VIEW: SavedView = {
  id: 7,
  name: "Engineering only",
  filter_expression: null,
  columns: [{ field: "title", visible: true }],
  sort: [{ field: "first_seen_at", dir: "desc" }],
  config: { page_size: 50 },
  created_at: "2025-05-01T00:00:00Z",
  updated_at: "2025-05-01T00:00:00Z",
};

const SAMPLE_PAYLOAD: SavedViewPayload = {
  name: "Engineering only",
  filter_expression: null,
  columns: [{ field: "title", visible: true }],
  sort: [{ field: "first_seen_at", dir: "desc" }],
  config: { page_size: 50 },
};

afterEach(() => {
  vi.restoreAllMocks();
  clearCsrfCookie();
});

describe("SAVED_VIEWS_QUERY_KEY", () => {
  it("is stable", () => {
    expect(SAVED_VIEWS_QUERY_KEY).toEqual(["saved-views"]);
  });
});

describe("useSavedViews", () => {
  it("fetches /api/v1/views and returns the list", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse([SAMPLE_VIEW]));

    const { result } = renderHook(() => useSavedViews(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy.mock.calls[0][0]).toBe("/api/v1/views");
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].name).toBe("Engineering only");
  });

  it("maps Spring saved view DTOs and column id fallbacks", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse([
        {
          id: 8,
          name: "Spring shape",
          filterExpression: {
            and: [{ field: "title", op: "contains", value: "engineer" }],
          },
          columns: [{ id: "title", visible: true }, { visible: false }],
          sort: [{ field: "title", dir: "asc" }],
          config: null,
          createdAt: "2025-05-02T00:00:00Z",
          updatedAt: "2025-05-03T00:00:00Z",
        },
      ]),
    );

    const { result } = renderHook(() => useSavedViews(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]).toEqual({
      id: 8,
      name: "Spring shape",
      filter_expression: {
        op: "and",
        children: [
          { field: "title", operator: "contains", value: "engineer" },
        ],
      },
      columns: [
        { field: "title", visible: true },
        { field: "", visible: false },
      ],
      sort: [{ field: "title", dir: "asc" }],
      config: {},
      created_at: "2025-05-02T00:00:00Z",
      updated_at: "2025-05-03T00:00:00Z",
    });
  });
});

describe("useCreateSavedView", () => {
  it("POSTs payload to /api/v1/views with CSRF header and invalidates list", async () => {
    seedCsrfCookie();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(SAMPLE_VIEW, { status: 201 }));

    const { result } = renderHook(() => useCreateSavedView(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate(SAMPLE_PAYLOAD);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/v1/views");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      name: "Engineering only",
      filterExpression: null,
      columns: [{ id: "title", visible: true }],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
    });
    const headers = new Headers(init?.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-csrf-token");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(result.current.data?.id).toBe(7);
  });

  it("defaults saved column visibility to true in create payloads", async () => {
    seedCsrfCookie();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(SAMPLE_VIEW, { status: 201 }));

    const { result } = renderHook(() => useCreateSavedView(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate({
      ...SAMPLE_PAYLOAD,
      columns: [{ field: "external_id" }],
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(JSON.parse(spy.mock.calls[0][1]?.body as string).columns).toEqual([
      { id: "external_id", visible: true },
    ]);
  });
});

describe("useUpdateSavedView", () => {
  it("PUTs payload to /api/v1/views/<id> with CSRF header", async () => {
    seedCsrfCookie();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(SAMPLE_VIEW));

    const { result } = renderHook(() => useUpdateSavedView(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate({ id: 7, payload: SAMPLE_PAYLOAD });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/v1/views/7");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({
      name: "Engineering only",
      filterExpression: null,
      columns: [{ id: "title", visible: true }],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
    });
    const headers = new Headers(init?.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-csrf-token");
  });
});

describe("useDeleteSavedView", () => {
  it("DELETEs /api/v1/views/<id> with CSRF header", async () => {
    seedCsrfCookie();
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const { result } = renderHook(() => useDeleteSavedView(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate(7);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/v1/views/7");
    expect(init?.method).toBe("DELETE");
    const headers = new Headers(init?.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-csrf-token");
  });

  it("surfaces non-2xx responses as errors", async () => {
    seedCsrfCookie();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("nope", { status: 404 }),
    );

    const { result } = renderHook(() => useDeleteSavedView(), {
      wrapper: createQueryWrapper(),
    });

    result.current.mutate(99);
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
