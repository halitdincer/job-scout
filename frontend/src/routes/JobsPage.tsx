import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { Options } from "tabulator-tables";

import { useJobs, type SortSpec } from "@/api/jobs";
import { FiltersPanel } from "@/components/FiltersPanel";
import { Tabulator } from "@/components/Tabulator";
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

const DEFAULT_PAGE_SIZE = 50;

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
  const columns = useMemo(() => getJobColumns(), []);
  const tableOptions = useMemo<Partial<Options>>(
    () => ({
      height: "65vh",
      index: "id",
      columnDefaults: { headerSort: false },
      placeholder: "No jobs found",
    }),
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

          <div id="pagination-bar" className="flex flex-wrap items-center gap-3">
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

      <Tabulator
        id="jobs-grid"
        className="min-h-[65vh] w-full overflow-hidden rounded-md border border-border"
        columns={columns}
        data={rows}
        options={tableOptions}
        onSortChanged={handleSortChanged}
      />
    </section>
  );
}
