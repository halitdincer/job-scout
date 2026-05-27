import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DeleteViewDialog } from "./DeleteViewDialog";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { SavedView } from "@/types/api";

const VIEW: SavedView = {
  id: 12,
  name: "Engineering only",
  filter_expression: null,
  columns: [],
  sort: [],
  config: {},
  created_at: "2025-05-01T00:00:00Z",
  updated_at: "2025-05-01T00:00:00Z",
};

beforeEach(() => {
  document.cookie = "csrftoken=t; path=/";
});

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

function renderDialog(props: Partial<React.ComponentProps<typeof DeleteViewDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onDeleted = vi.fn();
  const Wrapper = createQueryWrapper();
  return {
    onOpenChange,
    onDeleted,
    ...render(
      <Wrapper>
        <DeleteViewDialog
          open
          onOpenChange={onOpenChange}
          view={VIEW}
          onDeleted={onDeleted}
          {...props}
        />
      </Wrapper>,
    ),
  };
}

describe("DeleteViewDialog", () => {
  it("shows the view name", () => {
    renderDialog();
    expect(screen.getByText(/Engineering only/)).toBeInTheDocument();
  });

  it("DELETEs the view and notifies on success", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { onDeleted, onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Delete view" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/v1/views/12");
    expect(init?.method).toBe("DELETE");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cancels without deleting", () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const { onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(spy).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("oops", { status: 500 }),
    );
    const { onDeleted } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Delete view" }));
    await waitFor(() =>
      expect(screen.getByText(/could not delete/i)).toBeInTheDocument(),
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
