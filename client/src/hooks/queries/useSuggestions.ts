import { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSuggestions } from "../../api/queries.api";
import { chatKeys } from "../../constants/queryKeys";

/**
 * AI-generated suggestions tailored to the notebook's indexed sources.
 *
 * `enabled` gates the request on there being indexed data — until indexing
 * completes the query never fires, and it starts automatically once it does.
 * `refresh()` refetches a fresh batch, telling the server to avoid the ones
 * currently on screen so each refresh yields new questions.
 */
export function useSuggestions(
  notebookId: string | undefined,
  enabled: boolean,
) {
  const excludeRef = useRef<string[]>([]);

  const query = useQuery({
    queryKey: chatKeys.suggestions(notebookId ?? ""),
    queryFn: () => fetchSuggestions(notebookId as string, excludeRef.current),
    enabled: Boolean(notebookId) && enabled,
    staleTime: 5 * 60 * 1000,
  });

  const { data, refetch } = query;

  const refresh = useCallback(() => {
    excludeRef.current = data ?? [];
    return refetch();
  }, [data, refetch]);

  return { ...query, refresh };
}
