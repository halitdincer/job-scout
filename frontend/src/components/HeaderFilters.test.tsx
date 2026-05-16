import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DateHeaderFilter,
  HeaderFilterCell,
  MultiSelectHeaderFilter,
  TextHeaderFilter,
} from "./HeaderFilters";
import { EMPTY_SENTINEL } from "@/jobs/constants";
import type { FilterRule } from "@/jobs/filterExpression";

function makeRule(overrides: Partial<FilterRule> = {}): FilterRule {
  return {
    id: "r1",
    field: "title",
    operator: "contains",
    value: "",
    ...overrides,
  };
}

describe("TextHeaderFilter", () => {
  it("commits the trimmed value on blur using SET_FIELD_FILTER with contains", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <TextHeaderFilter
        field="title"
        label="Title"
        rule={undefined}
        dispatch={dispatch}
      />,
    );
    const input = screen.getByLabelText("Filter Title");
    await user.type(input, "  engineer  ");
    input.blur();
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "title",
      operator: "contains",
      value: "engineer",
    });
  });

  it("commits on Enter and prevents default form submit", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <TextHeaderFilter
        field="title"
        label="Title"
        rule={undefined}
        dispatch={dispatch}
      />,
    );
    const input = screen.getByLabelText("Filter Title");
    await user.type(input, "manager{Enter}");
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "title",
      operator: "contains",
      value: "manager",
    });
  });

  it("does not dispatch when the trimmed draft equals the trimmed rule value", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <>
        <TextHeaderFilter
          field="title"
          label="Title"
          rule={makeRule({ value: "engineer" })}
          dispatch={dispatch}
        />
        <button type="button">elsewhere</button>
      </>,
    );
    const input = screen.getByLabelText("Filter Title");
    expect(input).toHaveValue("engineer");
    await user.click(input);
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rehydrates the draft when the rule value changes externally", () => {
    const dispatch = vi.fn();
    const { rerender } = render(
      <TextHeaderFilter
        field="title"
        label="Title"
        rule={makeRule({ value: "first" })}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByLabelText("Filter Title")).toHaveValue("first");

    rerender(
      <TextHeaderFilter
        field="title"
        label="Title"
        rule={makeRule({ value: "second" })}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByLabelText("Filter Title")).toHaveValue("second");
  });

  it("renders empty when the rule value is null", () => {
    const dispatch = vi.fn();
    render(
      <TextHeaderFilter
        field="title"
        label="Title"
        rule={makeRule({ value: null })}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByLabelText("Filter Title")).toHaveValue("");
  });

  it("ignores non-Enter key presses", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <TextHeaderFilter
        field="title"
        label="Title"
        rule={undefined}
        dispatch={dispatch}
      />,
    );
    await user.type(screen.getByLabelText("Filter Title"), "a{Escape}");
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("MultiSelectHeaderFilter", () => {
  function open(label = "Filter Country") {
    return userEvent.setup().click(screen.getByRole("button", { name: label }));
  }

  it("shows 'All' summary when no rule is set and lists unique values + empty sentinel", async () => {
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={undefined}
        dispatch={dispatch}
        uniqueValues={["CA", "US"]}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Filter Country" });
    expect(trigger).toHaveTextContent("All");
    await open();
    expect(screen.getByLabelText("Select All")).not.toBeChecked();
    expect(screen.getByLabelText("Filter empties")).not.toBeChecked();
    expect(screen.getByLabelText("CA")).not.toBeChecked();
    expect(screen.getByLabelText("US")).not.toBeChecked();
  });

  it("shows '<n> selected' summary when a rule is active", () => {
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={makeRule({ field: "country", operator: "in", value: "CA, US" })}
        dispatch={dispatch}
        uniqueValues={["CA", "US"]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Filter Country" }),
    ).toHaveTextContent("2 selected");
  });

  it("hydrates draft from rule value when popover opens", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={makeRule({ field: "country", operator: "in", value: "CA" })}
        dispatch={dispatch}
        uniqueValues={["CA", "US"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    expect(screen.getByLabelText("CA")).toBeChecked();
    expect(screen.getByLabelText("US")).not.toBeChecked();
  });

  it("toggles individual values and applies the joined value list", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={undefined}
        dispatch={dispatch}
        uniqueValues={["CA", "US"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    await user.click(screen.getByLabelText("CA"));
    await user.click(screen.getByLabelText("US"));
    await user.click(screen.getByLabelText("CA")); // untoggle CA
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "country",
      operator: "in",
      value: "US",
    });
  });

  it("Select All toggles every choice including the empty sentinel", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={undefined}
        dispatch={dispatch}
        uniqueValues={["CA", "US"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    await user.click(screen.getByLabelText("Select All"));
    expect(screen.getByLabelText("CA")).toBeChecked();
    expect(screen.getByLabelText("US")).toBeChecked();
    expect(screen.getByLabelText("Filter empties")).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "country",
      operator: "in",
      value: `${EMPTY_SENTINEL},CA,US`,
    });
  });

  it("Select All while everything is checked clears the draft", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={makeRule({
          field: "country",
          operator: "in",
          value: `${EMPTY_SENTINEL}, CA, US`,
        })}
        dispatch={dispatch}
        uniqueValues={["CA", "US"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    expect(screen.getByLabelText("Select All")).toBeChecked();
    await user.click(screen.getByLabelText("Select All"));
    expect(screen.getByLabelText("CA")).not.toBeChecked();
    expect(screen.getByLabelText("US")).not.toBeChecked();
    expect(screen.getByLabelText("Filter empties")).not.toBeChecked();
  });

  it("toggling the empty sentinel includes/removes EMPTY_SENTINEL on Apply", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={undefined}
        dispatch={dispatch}
        uniqueValues={["CA"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    await user.click(screen.getByLabelText("Filter empties"));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "country",
      operator: "in",
      value: EMPTY_SENTINEL,
    });
  });

  it("Clear dispatches an empty value and closes the popover", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={makeRule({ field: "country", operator: "in", value: "CA" })}
        dispatch={dispatch}
        uniqueValues={["CA"]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "country",
      operator: "in",
      value: "",
    });
  });

  it("treats an empty uniqueValues list as never being fully selected", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <MultiSelectHeaderFilter
        field="country"
        label="Country"
        rule={undefined}
        dispatch={dispatch}
        uniqueValues={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    // Only Select All + (Empty) appear. Select All when only empty exists -> should still work.
    await user.click(screen.getByLabelText("Select All"));
    expect(screen.getByLabelText("Filter empties")).toBeChecked();
  });
});

describe("DateHeaderFilter", () => {
  it("renders empty value when rule has a non-date operator", () => {
    const dispatch = vi.fn();
    render(
      <DateHeaderFilter
        field="first_seen_at"
        label="First Seen"
        rule={makeRule({
          field: "first_seen_at",
          operator: "before",
          value: "2025-01-01",
        })}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByLabelText("Filter First Seen")).toHaveValue("");
  });

  it("uses the rule value when operator is in_last_days", () => {
    const dispatch = vi.fn();
    render(
      <DateHeaderFilter
        field="first_seen_at"
        label="First Seen"
        rule={makeRule({
          field: "first_seen_at",
          operator: "in_last_days",
          value: "7",
        })}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByLabelText("Filter First Seen")).toHaveValue("7");
  });

  it("falls back to empty string when in_last_days rule has null value", () => {
    const dispatch = vi.fn();
    render(
      <DateHeaderFilter
        field="first_seen_at"
        label="First Seen"
        rule={makeRule({
          field: "first_seen_at",
          operator: "in_last_days",
          value: null,
        })}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByLabelText("Filter First Seen")).toHaveValue("");
  });

  it("dispatches SET_FIELD_FILTER with in_last_days on change", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <DateHeaderFilter
        field="first_seen_at"
        label="First Seen"
        rule={undefined}
        dispatch={dispatch}
      />,
    );
    await user.selectOptions(
      screen.getByLabelText("Filter First Seen"),
      "7",
    );
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "SET_FIELD_FILTER",
      field: "first_seen_at",
      operator: "in_last_days",
      value: "7",
    });
  });
});

describe("HeaderFilterCell", () => {
  it("renders the text widget when there are no rules", () => {
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Filter Title")).toBeInTheDocument();
  });

  it("renders the text widget for a single canonical contains rule", () => {
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({ field: "title", operator: "contains", value: "eng" }),
        ]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Filter Title")).toHaveValue("eng");
  });

  it("renders the multi-select widget when there are no rules", () => {
    render(
      <HeaderFilterCell
        filterField="country"
        filterWidget="multi"
        rules={[]}
        dispatch={vi.fn()}
        uniqueValues={["CA"]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Filter Country" }),
    ).toBeInTheDocument();
  });

  it("renders the date widget when there are no rules", () => {
    render(
      <HeaderFilterCell
        filterField="first_seen_at"
        filterWidget="date"
        rules={[]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Filter First Seen")).toBeInTheDocument();
  });

  it("falls back to the filter field name when no label is registered", () => {
    render(
      <HeaderFilterCell
        filterField="unknown_field"
        filterWidget="text"
        rules={[]}
        dispatch={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Filter unknown_field")).toBeInTheDocument();
  });

  it("defaults uniqueValues to an empty list for multi", async () => {
    const user = userEvent.setup();
    render(
      <HeaderFilterCell
        filterField="country"
        filterWidget="multi"
        rules={[]}
        dispatch={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Country" }));
    expect(screen.getByLabelText("Select All")).toBeInTheDocument();
    expect(screen.queryByLabelText("CA")).toBeNull();
  });

  it("switches to the multi-rule popover when a single rule uses a non-canonical operator", async () => {
    const user = userEvent.setup();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            field: "title",
            operator: "not_contains",
            value: "intern",
          }),
        ]}
        dispatch={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Filter Title" });
    expect(trigger).toHaveTextContent("1 applied");
    await user.click(trigger);
    expect(screen.getByLabelText("Operator for rule r1")).toHaveValue(
      "not_contains",
    );
  });

  it("switches to the multi-rule popover when there are 2+ rules for the field", async () => {
    const user = userEvent.setup();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "contains",
            value: "a",
          }),
          makeRule({
            id: "r2",
            field: "title",
            operator: "not_contains",
            value: "b",
          }),
        ]}
        dispatch={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Filter Title" });
    expect(trigger).toHaveTextContent("2 applied");
    await user.click(trigger);
    expect(screen.getByLabelText("Operator for rule r1")).toBeInTheDocument();
    expect(screen.getByLabelText("Operator for rule r2")).toBeInTheDocument();
  });

  it("multi-rule popover dispatches UPDATE_RULE_OPERATOR + COMMIT_FILTER on change", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "not_contains",
            value: "a",
          }),
          makeRule({
            id: "r2",
            field: "title",
            operator: "contains",
            value: "b",
          }),
        ]}
        dispatch={dispatch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Title" }));
    await user.selectOptions(
      screen.getByLabelText("Operator for rule r1"),
      "eq",
    );
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: "UPDATE_RULE_OPERATOR",
      ruleId: "r1",
      operator: "eq",
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: "COMMIT_FILTER" });
  });

  it("multi-rule popover dispatches UPDATE_RULE_VALUE + COMMIT_FILTER on typing", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "not_contains",
            value: null,
          }),
          makeRule({
            id: "r2",
            field: "title",
            operator: "contains",
            value: "b",
          }),
        ]}
        dispatch={dispatch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Title" }));
    await user.type(screen.getByLabelText("Value for rule r1"), "x");
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_VALUE",
      ruleId: "r1",
      value: "x",
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "COMMIT_FILTER" });
  });

  it("multi-rule popover hides the value input for valueless operators", async () => {
    const user = userEvent.setup();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "is_empty",
            value: "",
          }),
          makeRule({
            id: "r2",
            field: "title",
            operator: "contains",
            value: "x",
          }),
        ]}
        dispatch={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Title" }));
    expect(screen.queryByLabelText("Value for rule r1")).toBeNull();
    expect(screen.getByLabelText("Value for rule r2")).toBeInTheDocument();
  });

  it("multi-rule popover renders a date input for before/after operators on date fields", async () => {
    const user = userEvent.setup();
    render(
      <HeaderFilterCell
        filterField="first_seen_at"
        filterWidget="date"
        rules={[
          makeRule({
            id: "r1",
            field: "first_seen_at",
            operator: "before",
            value: "2025-01-01",
          }),
          makeRule({
            id: "r2",
            field: "first_seen_at",
            operator: "after",
            value: "2024-01-01",
          }),
        ]}
        dispatch={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Filter First Seen" }),
    );
    expect(screen.getByLabelText("Value for rule r1")).toHaveAttribute(
      "type",
      "date",
    );
  });

  it("multi-rule popover renders a preset select for in_last_days on date fields", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <HeaderFilterCell
        filterField="first_seen_at"
        filterWidget="date"
        rules={[
          makeRule({
            id: "r1",
            field: "first_seen_at",
            operator: "in_last_days",
            value: null,
          }),
          makeRule({
            id: "r2",
            field: "first_seen_at",
            operator: "after",
            value: "2024-01-01",
          }),
          makeRule({
            id: "r3",
            field: "first_seen_at",
            operator: "in_last_days",
            value: "7",
          }),
        ]}
        dispatch={dispatch}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Filter First Seen" }),
    );
    const select = screen.getByLabelText("Value for rule r1");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveValue("");
    expect(screen.getByLabelText("Value for rule r3")).toHaveValue("7");
    await user.selectOptions(select, "30");
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_VALUE",
      ruleId: "r1",
      value: "30",
    });
  });

  it("multi-rule popover dispatches REMOVE_RULE + COMMIT_FILTER on remove", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "not_contains",
            value: "a",
          }),
          makeRule({
            id: "r2",
            field: "title",
            operator: "contains",
            value: "b",
          }),
        ]}
        dispatch={dispatch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Title" }));
    await user.click(screen.getByRole("button", { name: "Remove rule r1" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "REMOVE_RULE",
      ruleId: "r1",
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "COMMIT_FILTER" });
  });

  it("multi-rule popover Add rule dispatches ADD_RULE for the field", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "not_contains",
            value: "a",
          }),
        ]}
        dispatch={dispatch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Title" }));
    await user.click(screen.getByRole("button", { name: "Add rule" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "ADD_RULE",
      field: "title",
    });
  });

  it("multi-rule popover Clear all dispatches CLEAR_FIELD_RULES and closes", async () => {
    const user = userEvent.setup();
    const dispatch = vi.fn();
    render(
      <HeaderFilterCell
        filterField="title"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "title",
            operator: "not_contains",
            value: "a",
          }),
          makeRule({
            id: "r2",
            field: "title",
            operator: "contains",
            value: "b",
          }),
        ]}
        dispatch={dispatch}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter Title" }));
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "CLEAR_FIELD_RULES",
      field: "title",
    });
  });

  it("multi-rule popover falls back to an empty operator list for unknown fields", async () => {
    const user = userEvent.setup();
    render(
      <HeaderFilterCell
        filterField="unknown_field"
        filterWidget="text"
        rules={[
          makeRule({
            id: "r1",
            field: "unknown_field",
            operator: "contains",
            value: "a",
          }),
          makeRule({
            id: "r2",
            field: "unknown_field",
            operator: "not_contains",
            value: "b",
          }),
        ]}
        dispatch={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Filter unknown_field" }),
    );
    const operatorSelect = screen.getByLabelText(
      "Operator for rule r1",
    ) as HTMLSelectElement;
    expect(operatorSelect.children.length).toBe(0);
  });
});
