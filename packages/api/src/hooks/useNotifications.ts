import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { Notification } from "@paca/shared";

/**
 * Notifications targeted at the current user. Uses the user's profile.id,
 * not the auth user id — the `notifications` table joins via profiles.
 */
export function useNotifications(targetProfileId: string | undefined | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", targetProfileId],
    queryFn: async (): Promise<Notification[]> => {
      if (!targetProfileId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("target_user_id", targetProfileId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!targetProfileId,
  });

  // Subscribe to realtime inserts so a new bill alert or transaction
  // notification shows up without needing a manual refresh.
  useEffect(() => {
    if (!targetProfileId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", targetProfileId],
      });
    };

    const channel = supabase
      .channel(`notifications:${targetProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `target_user_id=eq.${targetProfileId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `target_user_id=eq.${targetProfileId}`,
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          // DELETE events only carry the old row's PK (default replica
          // identity), so the filter above would never match them. After
          // migration 00032 (replica identity full) payload.old carries
          // target_user_id and we skip other users' deletes.
          event: "DELETE",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const oldTarget = (payload.old as { target_user_id?: string })
            ?.target_user_id;
          if (oldTarget && oldTarget !== targetProfileId) return;
          invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetProfileId, queryClient]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetProfileId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("target_user_id", targetProfileId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
