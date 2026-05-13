import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { JobListing } from "@/types/api";

export type SortDirection = "asc" | "desc";

export type SortSpec = {
  field: string;
  dir: SortDirection;
};

export type JobsParams = {
  page: number;
  pageSize: number;
  sort: SortSpec[];
};

export type JobsEnvelope = {
  results: JobListing[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  sort: SortSpec[];
};

export const JOBS_QUERY_KEY = ["jobs"] as const;

export function buildJobsUrl({ page, pageSize, sort }: JobsParams) {
  const params = new URLSearchParams();
  if (sort.length > 0) {
    params.set("sort", sort.map((spec) => `${spec.field}:${spec.dir}`).join(","));
  }
  params.set("page", page.toString());
  params.set("page_size", pageSize.toString());
  return `/api/jobs/?${params.toString()}`;
}

export function useJobs(params: JobsParams) {
  return useQuery<JobsEnvelope>({
    queryKey: [...JOBS_QUERY_KEY, params],
    queryFn: () => apiFetch<JobsEnvelope>(buildJobsUrl(params)),
  });
}
