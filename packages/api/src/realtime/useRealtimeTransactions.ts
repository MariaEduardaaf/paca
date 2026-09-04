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
          // DELETE events only carry the old row's primary key under the
          // default replica identity, so a couple_id filter would silently
          // drop them — subscribe unfiltered. Once migration 00032 (replica
          // identity full) is applied, payload.old carries couple_id and we
          // skip other couples' deletes instead of refetching for the whole
          // user base; without it, old.couple_id is absent and we keep the
          // invalidate-on-any-delete behavior.
          event: "DELETE",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          const oldCoupleId = (payload.old as { couple_id?: string })?.couple_id;
          if (oldCoupleId && oldCoupleId !== coupleId) return;
          invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, queryClient]);
}
