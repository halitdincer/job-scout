import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { SavedView, SavedViewPayload } from "@/types/api";

export const SAVED_VIEWS_QUERY_KEY = ["saved-views"] as const;

export function useSavedViews() {
  return useQuery<SavedView[]>({
    queryKey: SAVED_VIEWS_QUERY_KEY,
    queryFn: () => apiFetch<SavedView[]>("/api/views/"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSavedView() {
  const queryClient = useQueryClient();
  return useMutation<SavedView, Error, SavedViewPayload>({
    mutationFn: (payload) =>
      apiFetch<SavedView>("/api/views/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_VIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateSavedView() {
  const queryClient = useQueryClient();
  return useMutation<SavedView, Error, { id: number; payload: SavedViewPayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<SavedView>(`/api/views/${id}/`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_VIEWS_QUERY_KEY });
    },
  });
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/views/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_VIEWS_QUERY_KEY });
    },
  });
}
