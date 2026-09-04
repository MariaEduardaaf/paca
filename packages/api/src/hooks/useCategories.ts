import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { Category, FinanceScope } from "@paca/shared";

async function getProfileContext(): Promise<{
  profileId: string | null;
  coupleId: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profileId: null, coupleId: null };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, couple_id")
    .eq("user_id", user.id)
    .single();
  // Throw so a transient failure doesn't cache the defaults-only list.
  if (error) throw error;
  return {
    profileId: profile?.id ?? null,
    coupleId: profile?.couple_id ?? null,
  };
}

async function getHiddenCategoryIds(coupleId: string | null): Promise<string[]> {
  if (!coupleId) return [];
  const { data: couple, error } = await supabase
    .from("couples")
    .select("hidden_category_ids")
    .eq("id", coupleId)
    .single();
  if (error) throw error;
  return (couple?.hidden_category_ids as string[]) ?? [];
}

export function useCategories(mode: FinanceScope = "couple") {
  return useQuery({
    queryKey: ["categories", mode],
    queryFn: async (): Promise<Category[]> => {
      const { profileId, coupleId } = await getProfileContext();
      const hidden = await getHiddenCategoryIds(coupleId);

      let query = supabase.from("categories").select("*").order("name");

      if (mode === "couple" && coupleId) {
        // Defaults + couple-shared customs (own couple's only)
        query = query.or(
          `is_default.eq.true,and(scope.eq.couple,couple_id.eq.${coupleId})`
        );
      } else if (mode === "personal" && profileId) {
        // Defaults + my personal customs
        query = query.or(
          `is_default.eq.true,and(scope.eq.personal,owner_id.eq.${profileId})`
        );
      } else {
        // Solo / unauth: only defaults
        query = query.eq("is_default", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      const all = (data ?? []) as Category[];
      // Apply soft-hide for defaults consistently across both modes.
      return all.filter((c) => !hidden.includes(c.id));
    },
  });
}

async function translateCategoryName(
  name: string,
  sourceLocale: string
): Promise<Record<string, string> | null> {
  try {
    const { data, error } = await supabase.functions.invoke("translate-category", {
      body: { name, sourceLocale },
    });
    if (error) throw error;
    return (data?.translations as Record<string, string>) ?? null;
  } catch (err) {
    console.error("translate-category failed", err);
    return null;
  }
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      icon: string;
      color: string;
      locale: string;
      mode: FinanceScope;
    }) => {
      const { profileId, coupleId } = await getProfileContext();
      if (!coupleId) throw new Error("No couple");
      if (input.mode === "personal" && !profileId) {
        throw new Error("No profile for personal category");
      }

      const translations = await translateCategoryName(input.name, input.locale);

      const { data, error } = await supabase
        .from("categories")
        .insert({
          couple_id: coupleId,
          scope: input.mode,
          owner_id: input.mode === "personal" ? profileId : null,
          name: input.name,
          icon: input.icon,
          color: input.color,
          is_default: false,
          name_translations: translations,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      icon?: string;
      color?: string;
      locale?: string;
    }) => {
      const updates: Partial<Category> = {};
      if (input.icon !== undefined) updates.icon = input.icon;
      if (input.color !== undefined) updates.color = input.color;
      if (input.name !== undefined) {
        updates.name = input.name;
        const translations = await translateCategoryName(
          input.name,
          input.locale ?? "en"
        );
        if (translations) updates.name_translations = translations;
      }
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (category: { id: string; is_default: boolean }) => {
      if (category.is_default) {
        // Soft-hide: add the category id to the couple's hidden list so the
        // shared default stays intact for every other couple.
        const { coupleId } = await getProfileContext();
        if (!coupleId) throw new Error("No couple");
        const hidden = await getHiddenCategoryIds(coupleId);
        if (!hidden.includes(category.id)) {
          const next = [...hidden, category.id];
          const { error } = await supabase
            .from("couples")
            .update({ hidden_category_ids: next })
            .eq("id", coupleId);
          if (error) throw error;
        }
      } else {
        // Reassign any transaction/budget using this category to the "Outros"
        // default, otherwise the FK blocks the delete with a 409.
        const { data: fallback, error: fallbackError } = await supabase
          .from("categories")
          .select("id")
          .eq("is_default", true)
          .eq("name", "Outros")
          .maybeSingle();
        if (fallbackError) throw fallbackError;
        if (fallback?.id) {
          const { error: reassignError } = await supabase
            .from("transactions")
            .update({ category_id: fallback.id })
            .eq("category_id", category.id);
          if (reassignError) throw reassignError;
          const { error: budgetCatError } = await supabase
            .from("budget_categories")
            .delete()
            .eq("category_id", category.id);
          if (budgetCatError) throw budgetCatError;
        }
        const { error } = await supabase
          .from("categories")
          .delete()
          .eq("id", category.id)
          .eq("is_default", false);
        if (error) throw error;
      }
      return category.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["couple"] });
      // Deleting a custom category reassigns transactions and removes budget
      // allocations, so those caches are stale too.
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budget"] });
    },
  });
}
