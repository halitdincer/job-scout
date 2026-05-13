import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { render, waitFor } from "@testing-library/react";
import type { ColumnDefinition } from "tabulator-tables";

import { Tabulator, type TabulatorHandle } from "./Tabulator";

const tabulatorMock = vi.hoisted(() => {
  const instances: MockTabulator[] = [];

  class MockTabulator {
    handlers: Record<string, (...args: unknown[]) => void> = {};
    replaceData = vi.fn(() => Promise.resolve());
    setColumns = vi.fn();
    destroy = vi.fn();
    redraw = vi.fn();
    getInstance = vi.fn();
    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      this.handlers[event] = handler;
    });

    constructor(
      public element: HTMLElement,
      public options: Record<string, unknown>,
    ) {
      instances.push(this);
    }
  }

  return {
    instances,
    MockTabulator,
  };
});

const instances = tabulatorMock.instances;

vi.mock("tabulator-tables", () => ({
  TabulatorFull: tabulatorMock.MockTabulator,
}));

function columns(field = "title"): ColumnDefinition[] {
  return [{ title: field, field }];
}

describe("Tabulator", () => {
  beforeEach(() => {
    instances.length = 0;
    vi.clearAllMocks();
  });

  it("constructs once and destroys on unmount", () => {
    const { rerender, unmount } = render(
      <Tabulator columns={columns()} data={[{ id: 1 }]} />,
    );
    rerender(<Tabulator columns={columns()} data={[{ id: 2 }]} />);

    expect(instances).toHaveLength(1);
    unmount();
    expect(instances[0].destroy).toHaveBeenCalledTimes(1);
  });

  it("replaces data when data changes", async () => {
    const first = [{ id: 1 }];
    const second = [{ id: 2 }];
    const { rerender } = render(<Tabulator columns={columns()} data={first} />);
    const instance = instances.at(-1)!;

    rerender(<Tabulator columns={columns()} data={second} />);

    await waitFor(() => expect(instance.replaceData).toHaveBeenCalledWith(second));
  });

  it("sets columns only when the column reference changes", () => {
    const initialColumns = columns("title");
    const newColumns = columns("source_name");
    const { rerender } = render(
      <Tabulator columns={initialColumns} data={[]} />,
    );
    const instance = instances.at(-1)!;

    rerender(<Tabulator columns={initialColumns} data={[]} />);
    expect(instance.setColumns).not.toHaveBeenCalled();

    rerender(<Tabulator columns={newColumns} data={[]} />);
    expect(instance.setColumns).toHaveBeenCalledWith(newColumns);
  });

  it("forwards sort events and exposes imperative methods", async () => {
    const onSortChanged = vi.fn();
    const ref = createRef<TabulatorHandle>();
    render(
      <Tabulator
        ref={ref}
        columns={columns()}
        data={[]}
        onSortChanged={onSortChanged}
      />,
    );
    const instance = instances.at(-1)!;

    instance.handlers.dataSorted([{ field: "title", dir: "asc" }]);
    expect(onSortChanged).toHaveBeenCalledWith([{ field: "title", dir: "asc" }]);

    await ref.current?.replaceData([{ id: 3 }]);
    ref.current?.redraw(true);
    expect(instance.replaceData).toHaveBeenCalledWith([{ id: 3 }]);
    expect(instance.redraw).toHaveBeenCalledWith(true);
    expect(ref.current?.getInstance()).toBe(instance);
  });

  it("accepts omitted event callbacks", () => {
    render(<Tabulator columns={columns()} data={[]} />);
    const instance = instances.at(-1)!;

    expect(() => {
      instance.handlers.dataSorted([]);
      instance.handlers.cellClick(new UIEvent("click"), {});
    }).not.toThrow();
  });
});
