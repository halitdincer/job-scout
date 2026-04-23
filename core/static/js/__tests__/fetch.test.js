import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStore } from "../store.js";
import { createInitialState, reducer } from "../reducer.js";
import * as A from "../actions.js";
import {
  attachFetchEffect,
  buildQueryString,
  fetchInputs,
} from "../effects/fetch.js";
import { resetRuleIdSequenceForTesting } from "../filterExpression.js";

beforeEach(() => {
  resetRuleIdSequenceForTesting();
});

function mkStore() {
  return createStore({
    reducer,
    initialState: createInitialState({
      columnOrder: ["title"],
      columnVisibility: { title: true },
    }),
  });
}

function settledResponse(body, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

function flushMicrotasks() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("buildQueryString", () => {
  it("omits `filter` when expression is null", () => {
    const store = mkStore();
    const qs = buildQueryString(store.getState());
    expect(qs).not.toContain("filter=");
    expect(qs).toContain("sort=first_seen_at%3Adesc");
    expect(qs).toContain("page=1");
    expect(qs).toContain("page_size=50");
  });

  it("serializes expression as JSON when present", () => {
    const store = mkStore();
    store.dispatch(A.addRule("title"));
    const id = store.getState().filter.rules[0].id;
    store.dispatch(A.updateRuleValue(id, "eng"));
    store.dispatch(A.commitFilter());
    const qs = buildQueryString(store.getState());
    expect(qs).toContain("filter=");
    expect(decodeURIComponent(qs)).toContain(
      '{"field":"title","operator":"contains","value":"eng"}'
    );
  });
});

describe("fetchInputs", () => {
  it("captures filter expression, sort, page, size", () => {
    const store = mkStore();
    const inputs = fetchInputs(store.getState());
    expect(inputs.page).toBe(1);
    expect(inputs.size).toBe(50);
    expect(inputs.expression).toBe(null);
    expect(inputs.sort).toEqual([{ field: "first_seen_at", dir: "desc" }]);
  });
});

describe("attachFetchEffect", () => {
  it("does not fire when non-watched state changes (no-op subscribe)", () => {
    const store = mkStore();
    const fetchImpl = vi.fn();
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.bumpRenderToken());
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fires when pagination changes", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [], count: 0, total_pages: 0 })
    );
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain("page=2");
  });

  it("fires when sort changes", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [], count: 0, total_pages: 0 })
    );
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setSort([{ field: "title", dir: "asc" }]));
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain("sort=title%3Aasc");
  });

  it("fires when filter expression changes (via COMMIT_FILTER)", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [], count: 0, total_pages: 0 })
    );
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.addRule("title"));
    // ADD_RULE does not change expression, only rules — should not fetch.
    expect(fetchImpl).not.toHaveBeenCalled();
    const id = store.getState().filter.rules[0].id;
    store.dispatch(A.updateRuleValue(id, "eng"));
    expect(fetchImpl).not.toHaveBeenCalled();
    store.dispatch(A.commitFilter());
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("dispatches FETCH_START with an incrementing requestId", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [], count: 0, total_pages: 0 })
    );
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.requestId).toBe(1);
    store.dispatch(A.setPage(3));
    await flushMicrotasks();
    expect(store.getState().data.requestId).toBe(2);
  });

  it("dispatches FETCH_SUCCESS on ok response", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [{ id: 1 }], count: 1, total_pages: 1 })
    );
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.loading).toBe(false);
    expect(store.getState().data.results).toEqual([{ id: 1 }]);
  });

  it("dispatches FETCH_ERROR on non-ok response", async () => {
    const store = mkStore();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(settledResponse("boom", false, 500));
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.error).toBeInstanceOf(Error);
    expect(store.getState().data.error.message).toContain("HTTP 500");
  });

  it("dispatches FETCH_ERROR on thrown error", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.error).toBeInstanceOf(Error);
    expect(store.getState().data.error.message).toBe("network");
  });

  it("swallows AbortError (does not dispatch FETCH_ERROR)", async () => {
    const store = mkStore();
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    const fetchImpl = vi.fn().mockRejectedValue(abortErr);
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.error).toBe(null);
  });

  it("aborts the in-flight request when state moves again", async () => {
    const store = mkStore();
    const firstSignals = [];
    const fetchImpl = vi.fn().mockImplementation((_url, { signal }) => {
      firstSignals.push(signal);
      return new Promise(() => {}); // never resolves
    });
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    store.dispatch(A.setPage(3));
    expect(firstSignals).toHaveLength(2);
    expect(firstSignals[0].aborted).toBe(true);
    expect(firstSignals[1].aborted).toBe(false);
  });

  it("triggerNow() issues a fetch without needing a state change", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [], count: 0, total_pages: 0 })
    );
    const effect = attachFetchEffect({ store, fetchImpl });
    effect.triggerNow();
    await flushMicrotasks();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not refetch when inputs are unchanged (deep equal)", () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockImplementation(() => new Promise(() => {}));
    attachFetchEffect({ store, fetchImpl });
    // Change sort once (should fetch), then set identical-shaped sort again
    // (should not re-fetch).
    store.dispatch(A.setSort([{ field: "title", dir: "asc" }]));
    store.dispatch(A.setSort([{ field: "title", dir: "asc" }]));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops future fetches", () => {
    const store = mkStore();
    const fetchImpl = vi.fn();
    const effect = attachFetchEffect({ store, fetchImpl });
    effect.unsubscribe();
    store.dispatch(A.setPage(2));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the provided endpoint", async () => {
    const store = mkStore();
    const fetchImpl = vi.fn().mockResolvedValue(
      settledResponse({ results: [], count: 0, total_pages: 0 })
    );
    attachFetchEffect({ store, fetchImpl, endpoint: "/api/other/" });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    const [url] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/^\/api\/other\/\?/);
  });

  it("dispatches FETCH_ERROR when the response body is a bare array (pre-envelope backend)", async () => {
    const store = mkStore();
    // Simulate an older backend returning a flat list instead of the
    // {results, count, total_pages, ...} envelope.
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(settledResponse([{ id: 1 }, { id: 2 }]));
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.error).toBeInstanceOf(Error);
    expect(store.getState().data.error.message).toContain("non-envelope");
    // Success path must NOT have been taken — totalPages stays at initial.
    expect(store.getState().data.totalPages).toBe(0);
    expect(store.getState().data.results).toEqual([]);
  });

  it("dispatches FETCH_ERROR when total_pages is missing from the payload", async () => {
    const store = mkStore();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(settledResponse({ results: [], count: 0 }));
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.error).toBeInstanceOf(Error);
    expect(store.getState().data.error.message).toContain("non-envelope");
  });

  it("dispatches FETCH_ERROR when results is missing from the payload", async () => {
    const store = mkStore();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(settledResponse({ count: 0, total_pages: 0 }));
    attachFetchEffect({ store, fetchImpl });
    store.dispatch(A.setPage(2));
    await flushMicrotasks();
    expect(store.getState().data.error).toBeInstanceOf(Error);
    expect(store.getState().data.error.message).toContain("non-envelope");
  });
});
