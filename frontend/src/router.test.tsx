import { describe, expect, it } from "vitest";

import { router } from "./router";

describe("router", () => {
  it("exposes at least one route", () => {
    expect(router.routes.length).toBeGreaterThan(0);
  });

  it("has a catch-all route", () => {
    const catchAll = router.routes.find((r) => r.path === "*");
    expect(catchAll).toBeDefined();
  });
});
