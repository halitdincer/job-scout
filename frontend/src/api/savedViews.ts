import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/fetcher";
import type { SavedView, SavedViewPayload } from "@/types/api";
import type { components } from "@/types/api.generated";
import {
  fromBackendFilterExpression,
  toBackendFilterExpression,
} from "./transforms";

export const SAVED_VIEWS_QUERY_KEY = ["saved-views"] as const;
type BackendSavedView = components["schemas"]["SavedView"];
type BackendSavedViewPayload = components["schemas"]["SavedViewCreateRequest"];

export function useSavedViews() {
  return useQuery<SavedView[]>({
    queryKey: SAVED_VIEWS_QUERY_KEY,
    queryFn: async () => (await apiFetch<BackendSavedView[]>("/api/v1/views")).map(mapSavedView),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSavedView() {
  const queryClient = useQueryClient();
  return useMutation<SavedView, Error, SavedViewPayload>({
    mutationFn: (payload) =>
      apiFetch<BackendSavedView>("/api/v1/views", {
        method: "POST",
        body: JSON.stringify(toBackendSavedViewPayload(payload)),
      }).then(mapSavedView),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_VIEWS_QUERY_KEY });
    },
  });
}

export function useUpdateSavedView() {
  const queryClient = useQueryClient();
  return useMutation<SavedView, Error, { id: number; payload: SavedViewPayload }>({
    mutationFn: ({ id, payload }) =>
      apiFetch<BackendSavedView>(`/api/v1/views/${id}`, {
        method: "PUT",
        body: JSON.stringify(toBackendSavedViewPayload(payload)),
      }).then(mapSavedView),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_VIEWS_QUERY_KEY });
    },
  });
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/v1/views/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_VIEWS_QUERY_KEY });
    },
  });
}

function mapSavedView(view: BackendSavedView): SavedView {
  const raw = view as BackendSavedView & Record<string, unknown>;
  return {
    id: view.id,
    name: view.name,
    filter_expression: fromBackendFilterExpression(
      view.filterExpression ?? raw.filter_expression,
    ),
    columns: view.columns.map((column) => ({
      field: column.id ?? (column as typeof column & { field?: string }).field ?? "",
      visible: column.visible,
    })),
    sort: view.sort,
    config: view.config ?? {},
    created_at: view.createdAt ?? (raw.created_at as string),
    updated_at: view.updatedAt ?? (raw.updated_at as string),
  };
}

function toBackendSavedViewPayload(payload: SavedViewPayload): BackendSavedViewPayload {
  return {
    name: payload.name,
    filterExpression: toBackendFilterExpression(payload.filter_expression) as BackendSavedViewPayload["filterExpression"],
    columns: payload.columns.map((column) => ({
      id: column.field,
      visible: column.visible ?? true,
    })),
    sort: payload.sort,
    config: payload.config,
  };
}
