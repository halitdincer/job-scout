import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { Source } from "@/types/api";

export const SOURCES_QUERY_KEY = ["sources"] as const;

export function useSources() {
  return useQuery<Source[]>({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: () => apiFetch<Source[]>("/api/sources/"),
  });
}
