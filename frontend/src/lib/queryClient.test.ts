import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "./queryClient";

describe("createQueryClient", () => {
  it("returns a QueryClient instance", () => {
    expect(createQueryClient()).toBeInstanceOf(QueryClient);
  });

  it("disables refetchOnWindowFocus and uses retry=1 by default", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.retry).toBe(1);
    expect(defaults?.staleTime).toBe(0);
  });
});
