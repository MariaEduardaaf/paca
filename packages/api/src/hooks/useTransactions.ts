import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type {
  TransactionWithCategory,
  TransactionInsert,
  TransactionUpdate,
  FinanceScope,
} from "@paca/shared";
import { getMonthRange } from "@paca/shared";

interface UseTransactionsOptions {
  coupleId: string;
  mode: FinanceScope;
  month?: string;
  type?: "income" | "expense";
  categoryId?: string;
  paidBy?: string;
}

export function useTransactions(options: UseTransactionsOptions) {
  const { coupleId, mode, month, type, categoryId, paidBy } = options;

  return useQuery({
    queryKey: ["transactions", coupleId, mode, month, type, categoryId, paidBy],
    queryFn: async (): Promise<TransactionWithCategory[]> => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          category:categories(name, icon, color, name_translations),
          paid_by_profile:profiles!paid_by(display_name, avatar_url)
        `)
        .eq("couple_id", coupleId)
        .eq("scope", mode)
        .order("date", { ascending: false });

      if (month) {
        const { start, end } = getMonthRange(month);
        query = query.gte("date", start).lte("date", end);
      }
      if (type) query = query.eq("type", type);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (paidBy) query = query.eq("paid_by", paidBy);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TransactionWithCategory[];
    },
    enabled: !!coupleId,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: TransactionInsert) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert(transaction)
        .select()
        .single();

      if (error) throw error;

      // Log only manual additions — AI scans are already tracked by the
      // scan edge functions so we don't want to double-count them.
      if (!transaction.ai_scanned) {
        supabase
          .from("usage_stats")
          .insert({
            profile_id: transaction.paid_by,
            couple_id: transaction.couple_id,
            action: "transaction_added",
            metadata: {
              type: transaction.type,
              currency: transaction.currency ?? null,
              scope: transaction.scope ?? "couple",
              has_notes: !!transaction.notes,
            },
          })
          .then(({ error: logError }) => {
            if (logError) console.error("usage log failed:", logError);
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // Budget "spent" totals are computed from transactions inside the
      // ["budget"] queryFn, so they must be invalidated together.
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TransactionUpdate }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}
