import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "./AppShell";

function renderShell(initialPath = "/runs") {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/runs" element={<p>runs body</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("renders the brand and navigation links", () => {
    renderShell();
    expect(screen.getByRole("link", { name: /job scout/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /^jobs$/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /^runs$/i })).toHaveAttribute(
      "href",
      "/runs",
    );
    expect(screen.getByRole("link", { name: /^sources$/i })).toHaveAttribute(
      "href",
      "/sources/",
    );
    expect(screen.getByRole("link", { name: /^admin$/i })).toHaveAttribute(
      "href",
      "/admin/",
    );
  });

  it("renders the child route via Outlet", () => {
    renderShell();
    expect(screen.getByText("runs body")).toBeInTheDocument();
  });
});
