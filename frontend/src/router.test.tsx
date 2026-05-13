import { describe, expect, it } from "vitest";

import { router } from "./router";

function findRouteByPath(
  routes: typeof router.routes,
  path: string,
): unknown {
  for (const route of routes) {
    if (route.path === path) {
      return route;
    }
    if (route.children) {
      const match = findRouteByPath(route.children, path);
      if (match) {
        return match;
      }
    }
  }
  return undefined;
}

describe("router", () => {
  it("exposes at least one route", () => {
    expect(router.routes.length).toBeGreaterThan(0);
  });

  it("has a catch-all route", () => {
    const catchAll = router.routes.find((r) => r.path === "*");
    expect(catchAll).toBeDefined();
  });

  it("routes /runs through the app shell", () => {
    expect(findRouteByPath(router.routes, "/runs")).toBeDefined();
  });

  it("routes /sources through the app shell", () => {
    expect(findRouteByPath(router.routes, "/sources")).toBeDefined();
  });

  it("routes /accounts/login to the login page", () => {
    expect(findRouteByPath(router.routes, "/accounts/login")).toBeDefined();
  });

  it("routes / through the app shell", () => {
    expect(findRouteByPath(router.routes, "/")).toBeDefined();
  });
});
