import { useQuery } from "@tanstack/react-query";

import type { FilterExpression } from "@/jobs/filterExpression";
import { apiFetch } from "@/lib/fetcher";
import type { JobListing } from "@/types/api";
import type { components } from "@/types/api.generated";
import { toBackendFilterExpression } from "./transforms";

export type SortDirection = "asc" | "desc";

export type SortSpec = {
  field: string;
  dir: SortDirection;
};

export type JobsParams = {
  page: number;
  pageSize: number;
  sort: SortSpec[];
  filter?: FilterExpression | null;
};

export type JobsEnvelope = {
  results: JobListing[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  sort: SortSpec[];
};

export type MarkJobSeenResponse = {
  listing_id: number;
  seen: true;
  created: boolean;
};

type BackendJobListing = components["schemas"]["JobListing"];
type BackendJobListingPage = components["schemas"]["JobListingPage"];
type BackendLocationTag = components["schemas"]["LocationTag"];
type BackendMarkSeenResponse = components["schemas"]["MarkSeenResponse"] | MarkJobSeenResponse;

export const JOBS_QUERY_KEY = ["jobs"] as const;

export function buildJobsUrl({ page, pageSize, sort, filter }: JobsParams) {
  const params = new URLSearchParams();
  if (sort.length > 0) {
    params.set("sort", sort.map((spec) => `${spec.field}:${spec.dir}`).join(","));
  }
  if (filter) {
    params.set("filter", JSON.stringify(toBackendFilterExpression(filter)));
  }
  params.set("page", Math.max(page - 1, 0).toString());
  params.set("pageSize", pageSize.toString());
  return `/api/v1/jobs?${params.toString()}`;
}

export function useJobs(params: JobsParams) {
  return useQuery<JobsEnvelope>({
    queryKey: [...JOBS_QUERY_KEY, params],
    queryFn: async () =>
      mapJobsEnvelope(
        await apiFetch<BackendJobListingPage | JobsEnvelope>(buildJobsUrl(params)),
        params.sort,
      ),
  });
}

export async function markJobSeen(listingId: number) {
  const response = await apiFetch<BackendMarkSeenResponse>(`/api/v1/jobs/${listingId}/seen`, {
    method: "POST",
    keepalive: true,
  });
  return {
    listing_id: "listing_id" in response ? response.listing_id : response.id,
    seen: true,
    created: "created" in response ? response.created : false,
  } satisfies MarkJobSeenResponse;
}

function mapJobsEnvelope(
  page: BackendJobListingPage | JobsEnvelope,
  sort: SortSpec[],
): JobsEnvelope {
  if ("results" in page) {
    return page;
  }
  const pageSize = page.pageSize ?? 50;
  const total = page.total ?? 0;
  return {
    results: (page.items ?? []).map(mapJobListing),
    count: total,
    page: (page.page ?? 0) + 1,
    page_size: pageSize,
    total_pages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    sort,
  };
}

function mapJobListing(job: BackendJobListing): JobListing {
  const locations = (job.locations ?? []).map(mapLocationTag);
  return {
    id: job.id,
    source_id: job.sourceId,
    source_name: job.sourceName,
    external_id: job.externalId,
    title: job.title,
    locations,
    url: job.url,
    status: job.status,
    country: uniqueValues(locations.map((location) => location.country_code)),
    region: uniqueValues(locations.map((location) => location.region_code)),
    city: uniqueValues(locations.map((location) => location.city)),
    expired_at: job.expiredAt ?? null,
    published_at: job.publishedAt ?? null,
    updated_at_source: job.updatedAtSource ?? null,
    first_seen_at: job.firstSeenAt,
    last_seen_at: job.lastSeenAt,
    seen: job.seen,
  };
}

function mapLocationTag(location: BackendLocationTag) {
  return {
    id: location.id,
    name: location.name,
    country_code: location.countryCode ?? "",
    region_code: location.regionCode ?? "",
    city: location.city ?? "",
    geo_key: location.geoKey ?? "",
  };
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
