import { useMemo } from "react";
import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import type { SortSpec } from "@/api/jobs";
import { HeaderFilterCell } from "@/components/HeaderFilters";
import type { JobColumnDef, JobColumnMeta } from "@/jobs/columns";
import type { FilterRule } from "@/jobs/filterExpression";
import type { JobGridRow } from "@/jobs/formatters";
import type { JobsAction } from "@/jobs/useJobsState";
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
  filterRules?: FilterRule[];
  filterDispatch?: (action: JobsAction) => void;
  /**
   * Server-supplied distinct values per filter field. When present they take
   * precedence over values collected from the current page so multi-select
   * dropdowns show every option, not just what happens to be on the current
   * page.
   */
  facets?: Record<string, string[]>;
};

function collectUniqueValues(
  data: JobGridRow[],
  columns: JobColumnDef[],
): Record<string, string[]> {
  const sets: Record<string, Set<string>> = {};
  for (const col of columns) {
    const meta = col.meta;
    if (!meta || meta.filterWidget !== "multi" || !meta.filterField) continue;
    const key = meta.uniqueValuesKey ?? String(col.id);
    sets[key] = new Set<string>();
  }
  for (const row of data) {
    for (const key of Object.keys(sets)) {
      const value = (row as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== null && item !== undefined && item !== "") {
            sets[key].add(String(item));
          }
        }
      } else if (value !== null && value !== undefined && value !== "") {
        sets[key].add(String(value));
      }
    }
  }
  const out: Record<string, string[]> = {};
  for (const [key, set] of Object.entries(sets)) {
    out[key] = Array.from(set).sort();
  }
  return out;
}

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
  filterRules,
  filterDispatch,
  facets,
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
  const uniqueValuesByKey = useMemo(
    () => collectUniqueValues(data, columns),
    [data, columns],
  );
  const rulesByField = useMemo(() => {
    const map = new Map<string, FilterRule[]>();
    for (const rule of filterRules ?? []) {
      const existing = map.get(rule.field);
      if (existing) {
        existing.push(rule);
      } else {
        map.set(rule.field, [rule]);
      }
    }
    return map;
  }, [filterRules]);

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
                    className="sticky top-0 z-10 bg-background"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      >
                        {headerContent}
                        {sortDir === "asc" ? (
                          <ArrowUp
                            className="h-3 w-3 text-primary"
                            aria-hidden="true"
                          />
                        ) : sortDir === "desc" ? (
                          <ArrowDown
                            className="h-3 w-3 text-primary"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronsUpDown
                            className="h-3 w-3 opacity-50"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      headerContent
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
          {filterRules !== undefined && filterDispatch !== undefined ? (
            <TableRow>
              {table.getVisibleLeafColumns().map((col) => {
                const meta = col.columnDef.meta as JobColumnMeta | undefined;
                const filterField = meta?.filterField;
                const filterWidget = meta?.filterWidget;
                if (!filterField || !filterWidget) {
                  return <TableHead key={col.id} className="py-1" />;
                }
                const key = meta?.uniqueValuesKey ?? String(col.id);
                const uniqueValues =
                  facets?.[filterField] ?? uniqueValuesByKey[key];
                return (
                  <TableHead key={col.id} className="py-1">
                    <HeaderFilterCell
                      filterField={filterField}
                      filterWidget={filterWidget}
                      rules={rulesByField.get(filterField) ?? []}
                      dispatch={filterDispatch}
                      uniqueValues={uniqueValues}
                    />
                  </TableHead>
                );
              })}
            </TableRow>
          ) : null}
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
