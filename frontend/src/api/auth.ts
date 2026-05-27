import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/fetcher";
import type { components } from "@/types/api.generated";

export type CurrentUser = components["schemas"]["CurrentUser"];

export const CURRENT_USER_QUERY_KEY = ["auth", "me"] as const;

export function useCurrentUser() {
  return useQuery<CurrentUser, ApiError>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => apiFetch<CurrentUser>("/api/v1/auth/me"),
    retry: (failureCount, error) => {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}
