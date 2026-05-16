import { useMemo } from "react";
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

import type { SortSpec } from "@/api/jobs";
import type { JobColumnDef, JobColumnMeta } from "@/jobs/columns";
import type { JobGridRow } from "@/jobs/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type JobsTableProps = {
  id?: string;
  className?: string;
  columns: JobColumnDef[];
  data: JobGridRow[];
  columnVisibility: Record<string, boolean>;
  sorting: SortSpec[];
  onSortingChange: (next: SortSpec[]) => void;
  emptyMessage?: string;
};

function toTanstackSorting(sorting: SortSpec[]): SortingState {
  return sorting.map((spec) => ({ id: spec.field, desc: spec.dir === "desc" }));
}

function toSortSpecs(state: SortingState): SortSpec[] {
  return state.map((entry) => ({
    field: entry.id,
    dir: entry.desc ? "desc" : "asc",
  }));
}

export function JobsTable({
  id,
  className,
  columns,
  data,
  columnVisibility,
  sorting,
  onSortingChange,
  emptyMessage = "No jobs found",
}: JobsTableProps) {
  const tanstackSorting = useMemo(() => toTanstackSorting(sorting), [sorting]);

  const table = useReactTable<JobGridRow>({
    data,
    columns,
    state: {
      columnVisibility,
      sorting: tanstackSorting,
    },
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, tanstackSorting);
      onSortingChange(toSortSpecs(next));
    },
  });

  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleFlatColumns().length;

  return (
    <div id={id} className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | JobColumnMeta
                  | undefined;
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                const headerContent = flexRender(
                  header.column.columnDef.header,
                  header.getContext(),
                );
                return (
                  <TableHead
                    key={header.id}
                    style={meta?.minWidth ? { minWidth: meta.minWidth } : undefined}
                    aria-sort={
                      sortDir === "asc"
                        ? "ascending"
                        : sortDir === "desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      >
                        {headerContent}
                        <span aria-hidden="true">
                          {sortDir === "asc"
                            ? "↑"
                            : sortDir === "desc"
                              ? "↓"
                              : ""}
                        </span>
                      </button>
                    ) : (
                      headerContent
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={Math.max(visibleColumnCount, 1)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | JobColumnMeta
                    | undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      style={
                        meta?.minWidth ? { minWidth: meta.minWidth } : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
