import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { components } from "@/types/api.generated";

export type FacetField =
  | "source_name"
  | "status"
  | "country"
  | "region"
  | "city";

export type FacetsResponse = Partial<Record<FacetField, string[]>>;
type BackendFacetBucket = components["schemas"]["FacetBucket"];
type BackendFacetsResponse = Partial<Record<FacetField, Array<BackendFacetBucket | string>>>;

export const FACETS_QUERY_KEY = ["jobs", "facets"] as const;

const DEFAULT_FIELDS: FacetField[] = [
  "source_name",
  "status",
  "country",
  "region",
  "city",
];

export function buildFacetsUrl(fields: FacetField[]) {
  const params = new URLSearchParams();
  params.set("fields", fields.join(","));
  return `/api/v1/jobs/facets?${params.toString()}`;
}

export function useJobFacets(fields: FacetField[] = DEFAULT_FIELDS) {
  return useQuery<FacetsResponse>({
    queryKey: [...FACETS_QUERY_KEY, fields.slice().sort().join(",")],
    queryFn: async () => mapFacets(await apiFetch<BackendFacetsResponse>(buildFacetsUrl(fields))),
    staleTime: 5 * 60 * 1000,
  });
}

function mapFacets(response: BackendFacetsResponse): FacetsResponse {
  return Object.fromEntries(
    Object.entries(response).map(([field, buckets]) => [
      field,
      (buckets ?? []).map((bucket) =>
        typeof bucket === "string" ? bucket : bucket.value,
      ),
    ]),
  ) as FacetsResponse;
}
