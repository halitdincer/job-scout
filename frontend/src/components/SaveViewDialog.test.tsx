import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SaveViewDialog } from "./SaveViewDialog";
import { createQueryWrapper } from "@/test/queryWrapper";
import type { SavedView, SavedViewPayload } from "@/types/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PAYLOAD: Omit<SavedViewPayload, "name"> = {
  filter_expression: null,
  columns: [],
  sort: [{ field: "first_seen_at", dir: "desc" }],
  config: { page_size: 50 },
};

const VIEW: SavedView = {
  id: 9,
  name: "Existing",
  filter_expression: null,
  columns: [],
  sort: [{ field: "first_seen_at", dir: "desc" }],
  config: { page_size: 50 },
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

function renderDialog(props: Partial<React.ComponentProps<typeof SaveViewDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const Wrapper = createQueryWrapper();
  return {
    onOpenChange,
    onSaved,
    ...render(
      <Wrapper>
        <SaveViewDialog
          open
          onOpenChange={onOpenChange}
          mode="create"
          payload={PAYLOAD}
          onSaved={onSaved}
          {...props}
        />
      </Wrapper>,
    ),
  };
}

describe("SaveViewDialog", () => {
  it("submits a create request when in create mode", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ...VIEW, name: "New view" }, 201));
    const { onSaved, onOpenChange } = renderDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "New view" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/v1/views");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      name: "New view",
      filterExpression: null,
      columns: [],
      sort: [{ field: "first_seen_at", dir: "desc" }],
      config: { page_size: 50 },
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits an update request when in update mode", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ...VIEW, name: "Renamed" }));
    const { onSaved } = renderDialog({ mode: "update", view: VIEW });

    const input = screen.getByLabelText("Name") as HTMLInputElement;
    expect(input.value).toBe("Existing");
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe("/api/v1/views/9");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string).name).toBe("Renamed");
  });

  it("shows a validation error when name is empty", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Save view" }));

    await waitFor(() =>
      expect(screen.getByText(/name is required/i)).toBeInTheDocument(),
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "duplicate" }), { status: 409 }),
    );
    const { onSaved } = renderDialog();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Dup" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save view" }));

    await waitFor(() =>
      expect(screen.getByText(/could not save view/i)).toBeInTheDocument(),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
