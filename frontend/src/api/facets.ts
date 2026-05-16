import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";

export type FacetField =
  | "source_name"
  | "status"
  | "employment_type"
  | "workplace_type"
  | "country"
  | "region"
  | "city";

export type FacetsResponse = Partial<Record<FacetField, string[]>>;

export const FACETS_QUERY_KEY = ["jobs", "facets"] as const;

const DEFAULT_FIELDS: FacetField[] = [
  "source_name",
  "status",
  "employment_type",
  "workplace_type",
  "country",
  "region",
  "city",
];

export function buildFacetsUrl(fields: FacetField[]) {
  const params = new URLSearchParams();
  params.set("fields", fields.join(","));
  return `/api/jobs/facets/?${params.toString()}`;
}

export function useJobFacets(fields: FacetField[] = DEFAULT_FIELDS) {
  return useQuery<FacetsResponse>({
    queryKey: [...FACETS_QUERY_KEY, fields.slice().sort().join(",")],
    queryFn: () => apiFetch<FacetsResponse>(buildFacetsUrl(fields)),
    staleTime: 5 * 60 * 1000,
  });
}
