import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColumnsMenu, type ColumnsMenuOption } from "./ColumnsMenu";

const OPTIONS: ColumnsMenuOption[] = [
  { field: "title", label: "Title" },
  { field: "source_name", label: "Source" },
  { field: "external_id", label: "External ID" },
];

describe("ColumnsMenu", () => {
  it("renders one checkbox per column reflecting current visibility", async () => {
    const user = userEvent.setup();
    render(
      <ColumnsMenu
        options={OPTIONS}
        visibility={{ title: true, source_name: true, external_id: false }}
        onToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Columns" }));
    const items = await screen.findAllByRole("menuitemcheckbox");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute("aria-checked", "true");
    expect(items[2]).toHaveAttribute("aria-checked", "false");
  });

  it("calls onToggle with the field and the next visibility on click", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ColumnsMenu
        options={OPTIONS}
        visibility={{ title: true, source_name: true, external_id: false }}
        onToggle={onToggle}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: /External ID/ }));

    expect(onToggle).toHaveBeenCalledWith("external_id", true);
  });

  it("shows the count of visible columns as a badge", async () => {
    render(
      <ColumnsMenu
        options={OPTIONS}
        visibility={{ title: true, source_name: false, external_id: false }}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("1 of 3 columns visible")).toBeInTheDocument();
  });
});
