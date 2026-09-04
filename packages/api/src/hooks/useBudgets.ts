import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type {
  BudgetWithCategories,
  BudgetInsert,
  BudgetCategoryInsert,
  CoupleWithPartner,
  FinanceScope,
} from "@paca/shared";

interface UseBudgetOptions {
  coupleId: string;
  month: string;
  mode: FinanceScope;
  ownerId?: string | null;
}

export function useBudget(options: UseBudgetOptions) {
  const { coupleId, month, mode, ownerId } = options;
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["budget", coupleId, mode, ownerId ?? null, month],
    queryFn: async (): Promise<BudgetWithCategories | null> => {
      let budgetQuery = supabase
        .from("budgets")
        .select(`
          *,
          categories:budget_categories(
            *,
            category:categories(id, name, icon, color, name_translations)
          )
        `)
        .eq("couple_id", coupleId)
        .eq("scope", mode)
        .eq("month", month);

      if (mode === "personal") {
        if (!ownerId) return null;
        budgetQuery = budgetQuery.eq("owner_id", ownerId);
      }

      const { data: budget, error } = await budgetQuery.maybeSingle();

      if (error) throw error;
      if (!budget) return null;

      // Calculate spent per category — scoped to the same mode + (for personal)
      // owner so a personal budget doesn't get charged with couple spending.
      let txQuery = supabase
        .from("transactions")
        .select("category_id, amount, currency")
        .eq("couple_id", coupleId)
        .eq("scope", mode)
        .eq("type", "expense")
        .gte("date", month)
        .lt("date", nextMonth(month));

      if (mode === "personal" && ownerId) {
        txQuery = txQuery.eq("paid_by", ownerId);
      }

      // useCouple already caches the couple (with primary_currency) — reuse it
      // instead of re-querying on every budget refetch; hit the network only
      // when the cache is empty.
      const cachedCurrency = queryClient.getQueryData<CoupleWithPartner | null>(["couple"])
        ?.primary_currency;

      const currencyPromise = cachedCurrency
        ? Promise.resolve(cachedCurrency)
        : supabase
            .from("couples")
            .select("primary_currency")
            .eq("id", coupleId)
            .single()
            .then(({ data: couple, error: coupleError }) => {
              // A swallowed error here would show spent = 0 for every category.
              if (coupleError) throw coupleError;
              return couple.primary_currency;
            });

      const [{ data: transactions, error: txError }, primaryCurrency] = await Promise.all([
        txQuery,
        currencyPromise,
      ]);

      if (txError) throw txError;

      // Unconverted foreign-currency rows (auto-convert off) can't be added to
      // primary-currency cents — leave them out of the spent totals.
      const spentByCategory = (transactions ?? []).reduce(
        (acc, t) => {
          if (t.currency && t.currency !== primaryCurrency) return acc;
          acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount;
          return acc;
        },
        {} as Record<string, number>
      );

      const allocatedIds = new Set<string>(
        (budget.categories ?? []).map((bc: any) => bc.category_id)
      );
      const missingIds = Object.keys(spentByCategory).filter(
        (id) => !allocatedIds.has(id)
      );

      // Fetch category metadata for spent-but-unallocated categories so we can
      // render them alongside the configured ones with allocated_amount = 0.
      let phantomCategories: any[] = [];
      if (missingIds.length > 0) {
        const { data: phantomMeta, error: phantomError } = await supabase
          .from("categories")
          .select("id, name, icon, color, name_translations")
          .in("id", missingIds);
        if (phantomError) throw phantomError;
        phantomCategories = (phantomMeta ?? []).map((cat) => ({
          id: `phantom-${cat.id}`,
          budget_id: budget.id,
          category_id: cat.id,
          allocated_amount: 0,
          spent: spentByCategory[cat.id] ?? 0,
          category: cat,
        }));
      }

      return {
        ...budget,
        categories: [
          ...budget.categories.map((bc: any) => ({
            ...bc,
            spent: spentByCategory[bc.category_id] ?? 0,
          })),
          ...phantomCategories,
        ],
      } as BudgetWithCategories;
    },
    enabled: !!coupleId && (mode !== "personal" || !!ownerId),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      budget,
      categories,
    }: {
      budget: BudgetInsert;
      categories: Omit<BudgetCategoryInsert, "budget_id">[];
    }) => {
      // Partial unique indexes prevent PostgREST from upserting cleanly, so do
      // a manual select-then-update/insert keyed on (couple_id, scope, month)
      // for couple budgets and (owner_id, scope, month) for personal ones.
      const scope = budget.scope ?? "couple";

      let existingQuery = supabase
        .from("budgets")
        .select("id")
        .eq("couple_id", budget.couple_id)
        .eq("scope", scope)
        .eq("month", budget.month);

      if (scope === "personal") {
        if (!budget.owner_id) throw new Error("personal budget needs owner_id");
        existingQuery = existingQuery.eq("owner_id", budget.owner_id);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      let savedBudget: { id: string } | null = null;

      if (existing) {
        const { data, error } = await supabase
          .from("budgets")
          .update({ total_amount: budget.total_amount })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        savedBudget = data;
      } else {
        const { data, error } = await supabase
          .from("budgets")
          .insert({ ...budget, scope })
          .select()
          .single();
        if (error) throw error;
        savedBudget = data;
      }

      if (!savedBudget) throw new Error("failed to save budget");

      // Sync category allocations without a destructive delete-then-insert
      // (which would wipe every allocation if the reinsert failed mid-flight):
      // upsert the submitted rows onto unique(budget_id, category_id), then
      // remove only the rows that are no longer in the submitted set.
      if (categories.length > 0) {
        const { error: catError } = await supabase
          .from("budget_categories")
          .upsert(
            categories.map((c) => ({ ...c, budget_id: savedBudget!.id })),
            { onConflict: "budget_id,category_id" }
          );

        if (catError) throw catError;
      }

      const keptIds = categories.map((c) => c.category_id);
      let staleQuery = supabase
        .from("budget_categories")
        .delete()
        .eq("budget_id", savedBudget.id);
      if (keptIds.length > 0) {
        staleQuery = staleQuery.not("category_id", "in", `(${keptIds.join(",")})`);
      }
      const { error: delError } = await staleQuery;

      if (delError) throw delError;

      return savedBudget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}

function nextMonth(monthStr: string): string {
  const date = new Date(monthStr + "T00:00:00");
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}
