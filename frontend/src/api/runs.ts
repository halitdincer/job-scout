import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { Run } from "@/types/api";
import type { components } from "@/types/api.generated";

export const RUNS_QUERY_KEY = ["runs"] as const;
type BackendRun = components["schemas"]["Run"];
type BackendRunPage = components["schemas"]["RunPage"];

export function useRuns() {
  return useQuery<Run[]>({
    queryKey: RUNS_QUERY_KEY,
    queryFn: async () => {
      const body = await apiFetch<BackendRunPage | Run[]>("/api/v1/runs");
      return Array.isArray(body) ? body : body.items.map(mapRun);
    },
  });
}

function mapRun(run: BackendRun): Run {
  return {
    id: run.id,
    status: run.status.toLowerCase() as Run["status"],
    started_at: run.startedAt ?? null,
    finished_at: run.finishedAt ?? null,
    sources_processed: run.sourcesProcessed,
    listings_created: run.listingsCreated,
    listings_updated: run.listingsUpdated,
    listings_expired: run.listingsExpired,
    error_message: run.errorMessage ?? null,
    created_at: run.createdAt,
  };
}
