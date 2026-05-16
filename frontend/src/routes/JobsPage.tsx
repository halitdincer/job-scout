import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { useJobs, type SortSpec } from "@/api/jobs";
import { ColumnsMenu, type ColumnsMenuOption } from "@/components/ColumnsMenu";
import { DeleteViewDialog } from "@/components/DeleteViewDialog";
import { FiltersPanel } from "@/components/FiltersPanel";
import { JobsTable } from "@/components/JobsTable";
import { SaveViewDialog } from "@/components/SaveViewDialog";
import { SavedViewsMenu } from "@/components/SavedViewsMenu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DEFAULT_JOB_SORT, getJobColumns, PAGE_SIZES } from "@/jobs/columns";
import { mapJobRow } from "@/jobs/formatters";
import { useJobsState } from "@/jobs/useJobsState";
import type { SavedView, SavedViewColumn } from "@/types/api";

const DEFAULT_PAGE_SIZE = 50;

const ALL_JOB_COLUMNS = getJobColumns();

const COLUMN_MENU_OPTIONS: ColumnsMenuOption[] = ALL_JOB_COLUMNS.map((col) => ({
  field: String(col.id),
  label: String(col.header),
}));

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = Object.fromEntries(
  ALL_JOB_COLUMNS.map((col) => [
    String(col.id),
    col.meta?.defaultVisible !== false,
  ]),
);

function visibilityToSavedColumns(
  visibility: Record<string, boolean>,
): SavedViewColumn[] {
  return COLUMN_MENU_OPTIONS.map((opt) => ({
    field: opt.field,
    visible: !!visibility[opt.field],
  }));
}

function savedColumnsToVisibility(
  columns: SavedViewColumn[],
): Record<string, boolean> {
  const out = { ...DEFAULT_COLUMN_VISIBILITY };
  for (const c of columns) {
    out[c.field] = c.visible !== false;
  }
  return out;
}

function normalizeSort(sort: SortSpec[]) {
  return sort.length > 0 ? sort : DEFAULT_JOB_SORT;
}

function serializeSort(sort: SortSpec[]) {
  return JSON.stringify(sort);
}

export function JobsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<SortSpec[]>(DEFAULT_JOB_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [saveDialog, setSaveDialog] = useState<
    { mode: "create" } | { mode: "update"; view: SavedView } | null
  >(null);
  const [deleteDialogView, setDeleteDialogView] = useState<SavedView | null>(
    null,
  );
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >(DEFAULT_COLUMN_VISIBILITY);
  const { state: filterState, dispatch: filterDispatch } = useJobsState();
  const previousExpressionRef = useRef(filterState.expression);

  useEffect(() => {
    if (previousExpressionRef.current !== filterState.expression) {
      previousExpressionRef.current = filterState.expression;
      setPage(1);
    }
  }, [filterState.expression]);

  const jobsQuery = useJobs({
    page,
    pageSize,
    sort,
    filter: filterState.expression,
  });
  const rows = useMemo(
    () => (jobsQuery.data?.results ?? []).map(mapJobRow),
    [jobsQuery.data?.results],
  );
  const handleColumnToggle = useCallback(
    (field: string, nextVisible: boolean) => {
      setColumnVisibility((prev) => ({ ...prev, [field]: nextVisible }));
    },
    [],
  );
  const totalPages = jobsQuery.data?.total_pages ?? 0;
  const count = jobsQuery.data?.count ?? 0;
  const maxPage = Math.max(totalPages, 1);
  const currentSortKey = serializeSort(sort);
  const activeRuleCount = filterState.rules.length;

  const handlePageSizeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(event.target.value));
      setPage(1);
    },
    [],
  );

  const handleSortChanged = useCallback(
    (nextSort: SortSpec[]) => {
      const normalizedSort = normalizeSort(nextSort);
      if (serializeSort(normalizedSort) !== currentSortKey) {
        setSort(normalizedSort);
        setPage(1);
      }
    },
    [currentSortKey],
  );

  const handleFiltersApplied = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  const handleLoadView = useCallback(
    (view: SavedView) => {
      filterDispatch({
        type: "SET_FILTER_FROM_EXPRESSION",
        expression: view.filter_expression,
      });
      setSort(normalizeSort(view.sort as SortSpec[]));
      const nextPageSize = view.config?.page_size ?? DEFAULT_PAGE_SIZE;
      setPageSize(nextPageSize);
      setColumnVisibility(savedColumnsToVisibility(view.columns));
      setPage(1);
      setCurrentViewId(view.id);
    },
    [filterDispatch],
  );

  const savedViewPayload = useMemo(
    () => ({
      filter_expression: filterState.expression,
      columns: visibilityToSavedColumns(columnVisibility),
      sort,
      config: { page_size: pageSize },
    }),
    [filterState.expression, sort, pageSize, columnVisibility],
  );

  const handleSaveAs = useCallback(() => {
    setSaveDialog({ mode: "create" });
  }, []);
  const handleSaveChanges = useCallback((view: SavedView) => {
    setSaveDialog({ mode: "update", view });
  }, []);
  const handleDelete = useCallback((view: SavedView) => {
    setDeleteDialogView(view);
  }, []);
  const handleSaved = useCallback((view: SavedView) => {
    setCurrentViewId(view.id);
  }, []);
  const handleDeleted = useCallback(() => {
    setCurrentViewId(null);
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {count.toLocaleString()} listings across configured sources.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SavedViewsMenu
            currentViewId={currentViewId}
            onLoadView={handleLoadView}
            onSaveAs={handleSaveAs}
            onSaveChanges={handleSaveChanges}
            onDelete={handleDelete}
          />
          <ColumnsMenu
            options={COLUMN_MENU_OPTIONS}
            visibility={columnVisibility}
            onToggle={handleColumnToggle}
          />
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                id="filters-toggle"
                aria-label="Open filters"
              >
                Filters
                {activeRuleCount > 0 ? (
                  <span
                    aria-label={`${activeRuleCount} active filters`}
                    className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground"
                  >
                    {activeRuleCount}
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>
                  Build a filter expression. Changes apply when you press
                  Apply.
                </SheetDescription>
              </SheetHeader>
              <FiltersPanel
                state={filterState}
                dispatch={filterDispatch}
                onApplied={handleFiltersApplied}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {jobsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading jobs…</p>
      ) : null}

      {jobsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load jobs.
        </p>
      ) : null}

      <JobsTable
        id="jobs-grid"
        className="min-h-[65vh] w-full overflow-hidden rounded-md border border-border"
        columns={ALL_JOB_COLUMNS}
        data={rows}
        columnVisibility={columnVisibility}
        sorting={sort}
        onSortingChange={handleSortChanged}
      />

      <div
        id="pagination-bar"
        className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3"
      >
        <label
          htmlFor="page-size-select"
          className="text-sm font-medium text-muted-foreground"
        >
          Page size
        </label>
        <select
          id="page-size-select"
          aria-label="Page size"
          value={pageSize}
          onChange={handlePageSizeChange}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          id="page-prev"
          type="button"
          onClick={() => setPage((current) => current - 1)}
          disabled={page <= 1}
          className="h-9 rounded-md border border-input px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span
          id="page-info"
          aria-live="polite"
          className="min-w-24 text-center text-sm text-muted-foreground"
        >
          Page {page} of {maxPage}
        </span>
        <button
          id="page-next"
          type="button"
          onClick={() => setPage((current) => current + 1)}
          disabled={page >= maxPage}
          className="h-9 rounded-md border border-input px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {saveDialog ? (
        <SaveViewDialog
          open
          onOpenChange={(open) => {
            if (!open) setSaveDialog(null);
          }}
          mode={saveDialog.mode}
          view={saveDialog.mode === "update" ? saveDialog.view : undefined}
          payload={savedViewPayload}
          onSaved={handleSaved}
        />
      ) : null}

      {deleteDialogView ? (
        <DeleteViewDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteDialogView(null);
          }}
          view={deleteDialogView}
          onDeleted={handleDeleted}
        />
      ) : null}
    </section>
  );
}
