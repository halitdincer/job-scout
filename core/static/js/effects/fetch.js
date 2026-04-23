/**
 * Fetch effect.
 *
 * Subscribes to the store. Whenever `filter`, `sort`, or `pagination` changes,
 * dispatches FETCH_START, issues a new `/api/jobs/` request, and dispatches
 * FETCH_SUCCESS or FETCH_ERROR when it settles. In-flight requests are
 * aborted when state moves again, and stale responses are dropped by the
 * reducer via `requestId` comparison.
 */
import {
  fetchStart,
  fetchSuccess,
  fetchError,
} from "../actions.js";
import {
  selectExpressionForServer,
  selectSortQueryParam,
} from "../selectors.js";

export function buildQueryString(state) {
  const params = new URLSearchParams();
  const expr = selectExpressionForServer(state);
  if (expr) {
    params.set("filter", JSON.stringify(expr));
  }
  params.set("sort", selectSortQueryParam(state));
  params.set("page", String(state.pagination.page));
  params.set("page_size", String(state.pagination.size));
  return params.toString();
}

/**
 * Returns the triple of state slices that, when unchanged, mean the fetch
 * effect should do nothing.
 */
export function fetchInputs(state) {
  return {
    expression: state.filter.expression,
    sort: state.sort,
    page: state.pagination.page,
    size: state.pagination.size,
  };
}

function inputsEqual(a, b) {
  // `a` and `b` are fresh fetchInputs() returns — never identity-equal,
  // so compare by field.
  if (a.page !== b.page || a.size !== b.size) return false;
  if (JSON.stringify(a.expression) !== JSON.stringify(b.expression)) return false;
  if (JSON.stringify(a.sort) !== JSON.stringify(b.sort)) return false;
  return true;
}

/**
 * Wire a fetch effect to a store.
 *
 * @param {object} options
 * @param {{getState: Function, dispatch: Function, subscribe: Function}} options.store
 * @param {(url: string, opts: {signal: AbortSignal}) => Promise<Response>} options.fetchImpl
 * @param {string} [options.endpoint]
 * @returns {Function} unsubscribe
 */
export function attachFetchEffect({ store, fetchImpl, endpoint = "/api/jobs/" }) {
  // Seed from current state so the first unwatched-state change does not
  // spuriously fire a fetch. Initial fetch must be requested via triggerNow().
  let lastInputs = fetchInputs(store.getState());
  let requestCounter = 0;
  let currentController = null;

  async function run() {
    requestCounter += 1;
    const requestId = requestCounter;
    if (currentController) currentController.abort();
    const controller = new AbortController();
    currentController = controller;

    store.dispatch(fetchStart(requestId));
    const url = `${endpoint}?${buildQueryString(store.getState())}`;

    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) {
        const text = await response.text();
        store.dispatch(
          fetchError(new Error(`HTTP ${response.status}: ${text}`), requestId)
        );
        return;
      }
      const payload = await response.json();
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        !Array.isArray(payload.results) ||
        typeof payload.total_pages !== "number"
      ) {
        // Defensive: if the deployed backend is a revision older than the
        // envelope rollout it returns a flat array (or a partial object).
        // Surface a specific error instead of letting `undefined` reach the
        // reducer and render "Page 1 of NaN" in the pagination bar.
        store.dispatch(
          fetchError(
            new Error(
              "/api/jobs/ returned a non-envelope response. The backend may be running an older revision."
            ),
            requestId
          )
        );
        return;
      }
      store.dispatch(fetchSuccess(payload, requestId));
    } catch (err) {
      if (err && err.name === "AbortError") return;
      store.dispatch(fetchError(err, requestId));
    }
  }

  const unsubscribe = store.subscribe(() => {
    const next = fetchInputs(store.getState());
    if (inputsEqual(lastInputs, next)) return;
    lastInputs = next;
    run();
  });

  return {
    unsubscribe,
    // Test-only: kick off an initial fetch (equivalent to the first
    // store change after mount).
    triggerNow() {
      lastInputs = fetchInputs(store.getState());
      run();
    },
  };
}
