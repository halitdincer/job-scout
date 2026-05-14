import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetRuleIdSequenceForTesting } from "@/jobs/filterExpression";
import {
  initialJobsState,
  jobsReducer,
  type JobsAction,
  type JobsState,
} from "@/jobs/useJobsState";

import { FiltersPanel } from "./FiltersPanel";

beforeEach(() => {
  resetRuleIdSequenceForTesting();
});

function setup(initial: Partial<JobsState> = {}) {
  let state: JobsState = { ...initialJobsState, ...initial };
  const onApplied = vi.fn();
  const dispatch = vi.fn((action: JobsAction) => {
    state = jobsReducer(state, action);
    utils.rerender(
      <FiltersPanel state={state} dispatch={dispatch} onApplied={onApplied} />,
    );
  });
  const utils = render(
    <FiltersPanel state={state} dispatch={dispatch} onApplied={onApplied} />,
  );
  return { dispatch, onApplied, ...utils };
}

describe("FiltersPanel", () => {
  it("renders the add-rule field picker with all known fields", () => {
    setup();
    const addPicker = screen.getByLabelText("Add filter rule");
    expect(addPicker).toBeInTheDocument();
    expect(
      (addPicker as HTMLSelectElement).options.length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("dispatches ADD_RULE when a field is picked", () => {
    const { dispatch } = setup();
    fireEvent.change(screen.getByLabelText("Add filter rule"), {
      target: { value: "title" },
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_RULE", field: "title" });
  });

  it("resets the add-rule picker after dispatch so the same field can be added again", () => {
    setup();
    const picker = screen.getByLabelText("Add filter rule") as HTMLSelectElement;
    fireEvent.change(picker, { target: { value: "title" } });
    expect(picker.value).toBe("");
  });

  it("renders rows for existing rules and dispatches operator changes", () => {
    const { dispatch } = setup({
      rules: [
        { id: "r1", field: "title", operator: "contains", value: "engineer" },
      ],
    });
    const operatorSelect = screen.getByLabelText(
      "Operator for Title",
    ) as HTMLSelectElement;
    expect(operatorSelect.value).toBe("contains");
    fireEvent.change(operatorSelect, { target: { value: "eq" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_OPERATOR",
      ruleId: "r1",
      operator: "eq",
    });
  });

  it("dispatches UPDATE_RULE_VALUE on input changes", () => {
    const { dispatch } = setup({
      rules: [{ id: "r1", field: "title", operator: "contains", value: "" }],
    });
    const valueInput = screen.getByLabelText("Value for Title");
    fireEvent.change(valueInput, { target: { value: "engineer" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_VALUE",
      ruleId: "r1",
      value: "engineer",
    });
  });

  it("hides the value input for is_empty / is_not_empty operators", () => {
    setup({
      rules: [{ id: "r1", field: "title", operator: "is_empty", value: "" }],
    });
    expect(screen.queryByLabelText("Value for Title")).toBeNull();
  });

  it("dispatches REMOVE_RULE when remove is clicked", () => {
    const { dispatch } = setup({
      rules: [{ id: "r1", field: "title", operator: "contains", value: "" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove Title rule" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "REMOVE_RULE",
      ruleId: "r1",
    });
  });

  it("dispatches CLEAR_RULES on the Clear button", () => {
    const { dispatch } = setup({
      rules: [{ id: "r1", field: "title", operator: "contains", value: "x" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "CLEAR_RULES" });
  });

  it("dispatches COMMIT_FILTER and notifies onApplied", () => {
    const { dispatch, onApplied } = setup({
      rules: [{ id: "r1", field: "title", operator: "contains", value: "x" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "COMMIT_FILTER" });
    expect(onApplied).toHaveBeenCalled();
  });

  it("shows a fallback message when the loaded expression is non-renderable", () => {
    setup({
      renderable: false,
      expression: {
        op: "or",
        children: [],
      },
    });
    expect(
      screen.getByText(/contains OR\/NOT/i, { exact: false }),
    ).toBeInTheDocument();
    // Apply / Add are disabled in this state
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeDisabled();
  });

  it("Apply is disabled when there are no rules", () => {
    setup();
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeDisabled();
  });

  it("ignores add-rule change events that resolve to an empty field", () => {
    const { dispatch } = setup();
    const picker = screen.getByLabelText("Add filter rule") as HTMLSelectElement;
    // Manually dispatch a change with empty value (cannot happen via UI, but
    // guards the early-return branch in handleAddRule).
    fireEvent.change(picker, { target: { value: "" } });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("renders a rule for an unknown field with the raw field name and unlabeled operator", () => {
    setup({
      rules: [
        {
          id: "r1",
          field: "experimental_field",
          operator: "experimental_op",
          value: "x",
        },
      ],
    });
    expect(screen.getByText("experimental_field")).toBeInTheDocument();
    const operatorSelect = screen.getByLabelText(
      "Operator for experimental_field",
    ) as HTMLSelectElement;
    // Falls back to the rule's own operator as the sole option, with its
    // raw name shown when no OPERATOR_LABELS entry exists.
    expect(operatorSelect.options).toHaveLength(1);
    expect(operatorSelect.options[0].value).toBe("experimental_op");
    expect(operatorSelect.options[0].textContent).toBe("experimental_op");
  });

  it("renders an empty value input when rule.value is null", () => {
    setup({
      rules: [{ id: "r1", field: "title", operator: "contains", value: null }],
    });
    expect(
      (screen.getByLabelText("Value for Title") as HTMLInputElement).value,
    ).toBe("");
  });

  it("renders a preset picker for date fields with in_last_days operator", () => {
    const { dispatch } = setup({
      rules: [
        {
          id: "r1",
          field: "first_seen_at",
          operator: "in_last_days",
          value: "7",
        },
      ],
    });
    const select = screen.getByLabelText(
      "Value for First Seen",
    ) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("7");
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toContain("Last 1 day");
    expect(labels).toContain("Last 3 days");
    expect(labels).toContain("Last 7 days");
    expect(labels).toContain("Last 30 days");

    fireEvent.change(select, { target: { value: "3" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_VALUE",
      ruleId: "r1",
      value: "3",
    });
  });

  it("preserves a non-preset in_last_days value as a custom option", () => {
    setup({
      rules: [
        {
          id: "r1",
          field: "first_seen_at",
          operator: "in_last_days",
          value: "42",
        },
      ],
    });
    const select = screen.getByLabelText(
      "Value for First Seen",
    ) as HTMLSelectElement;
    expect(select.value).toBe("42");
    const custom = Array.from(select.options).find((o) => o.value === "42");
    expect(custom?.textContent).toBe("Last 42 days");
  });

  it("renders a native date picker for date fields with before/after operators", () => {
    const { dispatch } = setup({
      rules: [
        {
          id: "r1",
          field: "first_seen_at",
          operator: "before",
          value: "2026-01-01",
        },
      ],
    });
    const input = screen.getByLabelText(
      "Value for First Seen",
    ) as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-01-01");

    fireEvent.change(input, { target: { value: "2026-05-13" } });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_VALUE",
      ruleId: "r1",
      value: "2026-05-13",
    });
  });

  it("swaps to the preset picker when operator changes from before to in_last_days", () => {
    const { dispatch } = setup({
      rules: [
        {
          id: "r1",
          field: "first_seen_at",
          operator: "before",
          value: "2026-01-01",
        },
      ],
    });
    fireEvent.change(screen.getByLabelText("Operator for First Seen"), {
      target: { value: "in_last_days" },
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "UPDATE_RULE_OPERATOR",
      ruleId: "r1",
      operator: "in_last_days",
    });
    const select = screen.getByLabelText(
      "Value for First Seen",
    ) as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
  });
});
