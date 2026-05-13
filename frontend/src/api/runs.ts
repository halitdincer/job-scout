import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { Run } from "@/types/api";

export const RUNS_QUERY_KEY = ["runs"] as const;

export function useRuns() {
  return useQuery<Run[]>({
    queryKey: RUNS_QUERY_KEY,
    queryFn: () => apiFetch<Run[]>("/api/runs/"),
  });
}
