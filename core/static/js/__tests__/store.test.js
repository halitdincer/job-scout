import { describe, expect, it, vi } from "vitest";

import { createStore } from "../store.js";

function identityReducer(state, action) {
  if (action.type === "SET") return action.payload;
  if (action.type === "INC") return { ...state, n: state.n + 1 };
  return state;
}

describe("createStore", () => {
  it("returns the initial state from getState", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 0 },
    });
    expect(store.getState()).toEqual({ n: 0 });
  });

  it("updates state via dispatch", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 0 },
    });
    store.dispatch({ type: "INC" });
    expect(store.getState()).toEqual({ n: 1 });
  });

  it("returns the dispatched action", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 0 },
    });
    const action = { type: "INC" };
    expect(store.dispatch(action)).toBe(action);
  });

  it("notifies subscribers with next state", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 0 },
    });
    const fn = vi.fn();
    store.subscribe(fn);
    store.dispatch({ type: "INC" });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ n: 1 });
  });

  it("supports multiple subscribers", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 0 },
    });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);
    store.dispatch({ type: "INC" });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops notifications", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 0 },
    });
    const fn = vi.fn();
    const unsubscribe = store.subscribe(fn);
    unsubscribe();
    store.dispatch({ type: "INC" });
    expect(fn).not.toHaveBeenCalled();
  });

  it("ignores unknown actions (passthrough)", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 5 },
    });
    store.dispatch({ type: "UNKNOWN" });
    expect(store.getState()).toEqual({ n: 5 });
  });

  it("SET action replaces state entirely", () => {
    const store = createStore({
      reducer: identityReducer,
      initialState: { n: 5 },
    });
    store.dispatch({ type: "SET", payload: { n: 99, extra: true } });
    expect(store.getState()).toEqual({ n: 99, extra: true });
  });
});
