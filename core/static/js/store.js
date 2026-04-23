/**
 * Tiny synchronous pub-sub store.
 *
 * Usage:
 *   const store = createStore({ reducer, initialState });
 *   const unsubscribe = store.subscribe((state) => render(state));
 *   store.dispatch({ type: "SOMETHING" });
 *   store.getState();
 */
export function createStore({ reducer, initialState }) {
  let state = initialState;
  const subs = new Set();

  return {
    getState() {
      return state;
    },
    dispatch(action) {
      state = reducer(state, action);
      subs.forEach((fn) => fn(state));
      return action;
    },
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}
