import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ApiError } from "@/lib/fetcher";

import { RequireAuth } from "./RequireAuth";

function renderRequireAuth(error?: unknown, path = "/runs?page=2") {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route element={<RequireAuth error={error} />}>
          <Route path="/runs" element={<p>protected content</p>} />
        </Route>
        <Route path="/accounts/login/" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  it("renders protected content when there is no auth error", () => {
    renderRequireAuth();
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("redirects 401 errors to login with next", () => {
    renderRequireAuth(new ApiError(401, "HTTP 401"));
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("redirects 403 errors to login with next", () => {
    renderRequireAuth(new ApiError(403, "HTTP 403"));
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("does not redirect non-auth API errors", () => {
    renderRequireAuth(new ApiError(500, "HTTP 500"));
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("does not redirect unknown errors", () => {
    renderRequireAuth(new Error("boom"));
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});
