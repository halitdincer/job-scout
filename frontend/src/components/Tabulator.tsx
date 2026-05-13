import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { TabulatorFull } from "tabulator-tables";
import type {
  CellComponent,
  ColumnDefinition,
  Options,
  SorterFromTable,
} from "tabulator-tables";

import type { SortSpec } from "@/api/jobs";

type TabulatorInstance = InstanceType<typeof TabulatorFull>;

export type TabulatorHandle = {
  replaceData(data: unknown[]): Promise<void>;
  redraw(force?: boolean): void;
  getInstance(): TabulatorInstance | null;
};

type TabulatorProps = {
  id?: string;
  className?: string;
  columns: ColumnDefinition[];
  data: unknown[];
  options?: Partial<Options>;
  onCellClick?: (event: UIEvent, cell: CellComponent) => void;
  onSortChanged?: (sort: SortSpec[]) => void;
};

const emptyOptions: Partial<Options> = {};
const ignoreSort = () => {};
const ignoreCellClick = () => {};

function toSortSpec(sorter: SorterFromTable): SortSpec {
  return { field: sorter.field, dir: sorter.dir };
}

export const Tabulator = forwardRef<TabulatorHandle, TabulatorProps>(
  function Tabulator(
    {
      id,
      className,
      columns,
      data,
      options = emptyOptions,
      onCellClick = ignoreCellClick,
      onSortChanged = ignoreSort,
    },
    ref,
  ) {
    const elementRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<TabulatorInstance | null>(null);
    const columnsRef = useRef(columns);
    const onCellClickRef = useRef(onCellClick);
    const onSortChangedRef = useRef(onSortChanged);

    onCellClickRef.current = onCellClick;
    onSortChangedRef.current = onSortChanged;

    useEffect(() => {
      const table = new TabulatorFull(elementRef.current!, {
        layout: "fitColumns",
        reactiveData: false,
        ...options,
        columns,
        data,
      });

      tableRef.current = table;
      columnsRef.current = columns;
      table.on("dataSorted", (sorters) => {
        onSortChangedRef.current(sorters.map(toSortSpec));
      });
      table.on("cellClick", (event, cell) => {
        onCellClickRef.current(event, cell);
      });

      return () => {
        table.destroy();
        tableRef.current = null;
      };
    }, []);

    useEffect(() => {
      tableRef.current!.replaceData(data as Array<{}>);
    }, [data]);

    useEffect(() => {
      if (columnsRef.current !== columns) {
        tableRef.current!.setColumns(columns);
        columnsRef.current = columns;
      }
    }, [columns]);

    useImperativeHandle(
      ref,
      () => ({
        replaceData(nextData) {
          return tableRef.current!.replaceData(nextData as Array<{}>);
        },
        redraw(force) {
          tableRef.current!.redraw(force);
        },
        getInstance() {
          return tableRef.current;
        },
      }),
      [],
    );

    return <div id={id} ref={elementRef} className={className} />;
  },
);
