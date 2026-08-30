import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useRealtimeTransactions(coupleId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!coupleId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Budget "spent" totals derive from transactions, so refresh them too.
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    };

    const channel = supabase
      .channel(`transactions:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `couple_id=eq.${coupleId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `couple_id=eq.${coupleId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          // DELETE events only carry the old row's primary key (default
          // replica identity), so a couple_id filter would silently drop them
          // — subscribe unfiltered and just invalidate.
          event: "DELETE",
          schema: "public",
          table: "transactions",
        },
        invalidate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);
}
