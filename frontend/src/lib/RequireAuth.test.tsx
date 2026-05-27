import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { createQueryWrapper } from "@/test/queryWrapper";

import { RequireAuth } from "./RequireAuth";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockAuthMe(status: number, body: unknown = {}) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function renderRequireAuth(path = "/runs?page=2") {
  const Wrapper = createQueryWrapper();
  return render(
    <Wrapper>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/runs" element={<p>protected content</p>} />
          </Route>
          <Route path="/accounts/login/" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe("RequireAuth", () => {
  it("renders protected content when /auth/me succeeds", async () => {
    mockAuthMe(200, {
      id: 1,
      username: "u",
      isStaff: false,
      isSuperuser: false,
    });
    renderRequireAuth();
    expect(await screen.findByText("protected content")).toBeInTheDocument();
  });

  it("redirects 401 from /auth/me to the login page", async () => {
    mockAuthMe(401);
    renderRequireAuth();
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("redirects 403 from /auth/me to the login page", async () => {
    mockAuthMe(403);
    renderRequireAuth();
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("renders protected content for non-auth errors so the page can surface its own error", async () => {
    mockAuthMe(500);
    renderRequireAuth();
    expect(await screen.findByText("protected content")).toBeInTheDocument();
  });

  it("renders nothing while /auth/me is in flight", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    renderRequireAuth();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("login page")).not.toBeInTheDocument();
  });
});
