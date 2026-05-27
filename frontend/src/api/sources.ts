import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { Source } from "@/types/api";
import type { components } from "@/types/api.generated";

export const SOURCES_QUERY_KEY = ["sources"] as const;
type BackendSource = components["schemas"]["Source"];

export function useSources() {
  return useQuery<Source[]>({
    queryKey: SOURCES_QUERY_KEY,
    queryFn: async () => (await apiFetch<BackendSource[]>("/api/v1/sources")).map(mapSource),
  });
}

function mapSource(source: BackendSource): Source {
  return {
    id: source.id,
    name: source.name,
    platform: source.platform,
    board_id: source.boardId,
    is_active: source.isActive,
  };
}
