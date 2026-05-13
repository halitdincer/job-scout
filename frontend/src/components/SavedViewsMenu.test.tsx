import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SavedViewsMenu } from "./SavedViewsMenu";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { SavedView } from "@/types/api";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const VIEW_A: SavedView = {
  id: 1,
  name: "Engineering",
  filter_expression: null,
  columns: [],
  sort: [{ field: "first_seen_at", dir: "desc" }],
  config: { page_size: 50 },
  created_at: "2025-05-01T00:00:00Z",
  updated_at: "2025-05-01T00:00:00Z",
};
const VIEW_B: SavedView = { ...VIEW_A, id: 2, name: "Design" };

afterEach(() => {
  vi.restoreAllMocks();
});

type RenderOpts = Partial<React.ComponentProps<typeof SavedViewsMenu>>;

function renderMenu(opts: RenderOpts = {}) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    jsonResponse([VIEW_A, VIEW_B]),
  );
  const onLoadView = vi.fn();
  const onSaveAs = vi.fn();
  const onSaveChanges = vi.fn();
  const onDelete = vi.fn();
  const Wrapper = createQueryWrapper();
  const utils = render(
    <Wrapper>
      <SavedViewsMenu
        currentViewId={null}
        onLoadView={onLoadView}
        onSaveAs={onSaveAs}
        onSaveChanges={onSaveChanges}
        onDelete={onDelete}
        {...opts}
      />
    </Wrapper>,
  );
  return { onLoadView, onSaveAs, onSaveChanges, onDelete, ...utils };
}

describe("SavedViewsMenu", () => {
  it("lists views from the server and triggers onLoadView on click", async () => {
    const user = userEvent.setup();
    const { onLoadView } = renderMenu();

    await user.click(screen.getByRole("button", { name: /Saved views/i }));
    await waitFor(() =>
      expect(screen.getByText("Engineering")).toBeInTheDocument(),
    );

    await user.click(screen.getByText("Engineering"));
    expect(onLoadView).toHaveBeenCalledWith(VIEW_A);
  });

  it("exposes Save as… which calls onSaveAs", async () => {
    const user = userEvent.setup();
    const { onSaveAs } = renderMenu();

    await user.click(screen.getByRole("button", { name: /Saved views/i }));
    await waitFor(() =>
      expect(screen.getByText(/Save as/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Save as/i));
    expect(onSaveAs).toHaveBeenCalled();
  });

  it("only shows Save changes / Delete when a view is loaded", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: /Saved views/i }));
    await waitFor(() =>
      expect(screen.getByText("Engineering")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Save changes/i)).toBeNull();
    expect(screen.queryByText(/Delete view/i)).toBeNull();
  });

  it("shows Save changes and Delete view when a view is loaded", async () => {
    const user = userEvent.setup();
    const { onSaveChanges, onDelete } = renderMenu({ currentViewId: 1 });
    await user.click(screen.getByRole("button", { name: /Saved views/i }));
    await waitFor(() =>
      expect(screen.getByText(/Save changes/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Save changes/i));
    expect(onSaveChanges).toHaveBeenCalledWith(VIEW_A);

    // reopen menu after item-click closes it
    await user.click(screen.getByRole("button", { name: /Saved views/i }));
    await waitFor(() =>
      expect(screen.getByText(/Delete view/i)).toBeInTheDocument(),
    );
    await user.click(screen.getByText(/Delete view/i));
    expect(onDelete).toHaveBeenCalledWith(VIEW_A);
  });

  it("renders an empty placeholder when there are no saved views", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse([]));
    const Wrapper = createQueryWrapper();
    render(
      <Wrapper>
        <SavedViewsMenu
          currentViewId={null}
          onLoadView={vi.fn()}
          onSaveAs={vi.fn()}
          onSaveChanges={vi.fn()}
          onDelete={vi.fn()}
        />
      </Wrapper>,
    );
    await user.click(screen.getByRole("button", { name: /Saved views/i }));
    await waitFor(() =>
      expect(screen.getByText(/no saved views yet/i)).toBeInTheDocument(),
    );
  });
});
