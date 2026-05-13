import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it.each([
    ["completed", /bg-green/],
    ["failed", /bg-red/],
    ["running", /bg-blue/],
    ["pending", /bg-muted/],
  ])("applies the right tone for %s", (status, pattern) => {
    render(<StatusBadge status={status as never} />);
    const badge = screen.getByText(status);
    expect(badge.className).toMatch(pattern);
  });

  it("falls back to muted styling for unknown statuses", () => {
    // The Run model can only emit known statuses, but be defensive about
    // future statuses so the UI doesn't crash if the server adds one.
    render(<StatusBadge status={"weird" as never} />);
    expect(screen.getByText("weird").className).toMatch(/bg-muted/);
  });
});
