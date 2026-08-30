import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useProfile, useBudget, useCreateBudget, useCategories, useI18n, useAppStore } from "@paca/api";
import {
  getCurrentMonth,
  parseMoneyInput,
  centsToInput,
  BUDGET_THRESHOLDS,
  type BudgetWithCategories,
} from "@paca/shared";
import { ErrorState } from "../../components/ErrorState";
import { ScreenContainer } from "../../components/ScreenContainer";

type Screen = "overview" | "setup";

export default function Budget() {
  const { t, formatCurrency, formatMonthYear } = useI18n();
  const { data: profile } = useProfile();
  const mode = useAppStore((s) => s.mode);
  const coupleId = profile?.couple_id ?? "";
  const ownerId = mode === "personal" ? profile?.id ?? null : null;
  const [month, setMonth] = useState(getCurrentMonth());
  const [screen, setScreen] = useState<Screen>("overview");

  const { data: budget, isLoading, isError, refetch } = useBudget({ coupleId, month, mode, ownerId });

  const prevMonth = () => {
    const d = new Date(month + "T00:00:00");
    d.setMonth(d.getMonth() - 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };
  const nextMonth = () => {
    const d = new Date(month + "T00:00:00");
    d.setMonth(d.getMonth() + 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t.budget.title}
        </Text>
        {budget && screen === "overview" && (
          <TouchableOpacity
            onPress={() => setScreen("setup")}
            accessibilityRole="button"
            accessibilityLabel={t.budget.editBudget}
          >
            <Ionicons name="settings-outline" size={22} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Month nav */}
      <View className="flex-row items-center justify-between mx-6 mb-4 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
        <TouchableOpacity
          onPress={prevMonth}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel={t.format.previousMonth}
        >
          <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
          {formatMonthYear(month)}
        </Text>
        <TouchableOpacity
          onPress={nextMonth}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel={t.format.nextMonth}
        >
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#FF8FB1" />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : screen === "setup" || (!budget && screen === "overview") ? (
        <BudgetSetupMobile
          coupleId={coupleId}
          month={month}
          mode={mode}
          ownerId={ownerId}
          existingBudget={budget ?? null}
          onDone={() => setScreen("overview")}
          isNew={!budget}
        />
      ) : (
        <BudgetOverviewMobile budget={budget!} />
      )}
      </ScreenContainer>
    </SafeAreaView>
  );
}

function BudgetOverviewMobile({ budget }: { budget: BudgetWithCategories }) {
  const { t, formatCurrency, translateCategory } = useI18n();
  const totalSpent = budget.categories.reduce((sum, c) => sum + c.spent, 0);
  const totalRatio = budget.total_amount > 0 ? totalSpent / budget.total_amount : 0;
  const totalPercent = Math.round(totalRatio * 100);

  const getBarColor = (ratio: number) => {
    if (ratio >= BUDGET_THRESHOLDS.exceeded) return "#FF6B6B";
    if (ratio >= BUDGET_THRESHOLDS.normal) return "#FBBF24";
    return "#FF8FB1";
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Total card */}
      <View className="mx-6 bg-pink-primary rounded-3xl p-6 mb-6">
        <Text className="text-white/70 text-sm mb-1">{t.budget.totalBudget}</Text>
        <Text className="text-white text-3xl font-bold mb-1">
          {formatCurrency(budget.total_amount)}
        </Text>
        <Text className="text-white/70 text-sm mb-4">
          {formatCurrency(totalSpent)} {t.budget.spent} · {totalPercent}%
        </Text>
        <View className="h-3 bg-white/20 rounded-full overflow-hidden">
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </View>
      </View>

      {/* Categories */}
      <View className="px-6 gap-3 pb-6">
        {budget.categories.map((bc) => {
          const hasAllocation = bc.allocated_amount > 0;
          const hasSpending = bc.spent > 0;
          const ratio = hasAllocation
            ? bc.spent / bc.allocated_amount
            : hasSpending
              ? 1.5
              : 0;
          const percent = hasAllocation
            ? Math.round(ratio * 100)
            : hasSpending
              ? null
              : 0;

          return (
            <View
              key={bc.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${bc.category?.color ?? "#AEB6BF"}15` }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: bc.category?.color ?? "#AEB6BF" }}
                    >
                      {translateCategory(bc.category).charAt(0) || "?"}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {translateCategory(bc.category)}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {formatCurrency(bc.spent)} / {formatCurrency(bc.allocated_amount)}
                    </Text>
                  </View>
                </View>
                <Text
                  className="text-sm font-bold"
                  style={{
                    color:
                      ratio >= BUDGET_THRESHOLDS.exceeded
                        ? "#FF6B6B"
                        : ratio >= BUDGET_THRESHOLDS.normal
                          ? "#F59E0B"
                          : "#6B7280",
                  }}
                >
                  {percent != null ? `${percent}%` : "—"}
                </Text>
              </View>
              <View className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(percent ?? 100, 100)}%`,
                    backgroundColor: getBarColor(ratio),
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function BudgetSetupMobile({
  coupleId,
  month,
  mode,
  ownerId,
  existingBudget,
  onDone,
  isNew,
}: {
  coupleId: string;
  month: string;
  mode: "couple" | "personal";
  ownerId: string | null;
  existingBudget: BudgetWithCategories | null;
  onDone: () => void;
  isNew: boolean;
}) {
  const { t, formatCurrency, translateCategory } = useI18n();
  const createBudget = useCreateBudget();
  // centsToInput renders the decimal-comma string the parser round-trips
  // (String(cents/100) produced dot decimals like "3000.5").
  const [totalAmount, setTotalAmount] = useState(
    existingBudget ? centsToInput(existingBudget.total_amount) : ""
  );
  const [allocations, setAllocations] = useState<Record<string, string>>(() => {
    if (!existingBudget) return {};
    const allocs: Record<string, string> = {};
    for (const bc of existingBudget.categories) {
      allocs[bc.category_id] = centsToInput(bc.allocated_amount);
    }
    return allocs;
  });
  const [error, setError] = useState("");

  // Shared hook: same scoping as everywhere else, plus the hidden_category_ids
  // filter so soft-deleted defaults don't reappear in the budget setup.
  const { data: categories = [] } = useCategories(mode);

  const handleSave = async () => {
    setError("");
    // Locale-tolerant: "12,50", "12.50" and "1.234,56" all parse correctly.
    const totalCents = parseMoneyInput(totalAmount);
    if (!totalCents) {
      setError(t.budget.invalidTotal);
      return;
    }

    const cats = Object.entries(allocations)
      .map(([categoryId, val]) => ({
        category_id: categoryId,
        allocated_amount: parseMoneyInput(val) ?? 0,
      }))
      .filter((c) => c.allocated_amount > 0);

    try {
      await createBudget.mutateAsync({
        budget: {
          couple_id: coupleId,
          scope: mode,
          owner_id: mode === "personal" ? ownerId : null,
          month,
          total_amount: totalCents,
        },
        categories: cats,
      });
      onDone();
    } catch {
      setError(t.budget.saveError);
    }
  };

  return (
    // Same KAV pattern as add-transaction.tsx — without it the iOS keyboard
    // covers the lower per-category inputs with no way to scroll to them.
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
    <ScrollView
      className="flex-1 px-6"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
        {isNew ? t.budget.createBudget : t.budget.editBudget}
      </Text>

      {error ? (
        <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-4">
          <Text className="text-red-500 text-sm text-center">{error}</Text>
        </View>
      ) : null}

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
          {t.budget.totalMonth}
        </Text>
        <TextInput
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-lg font-bold text-gray-800 dark:text-gray-100 text-center"
          placeholder="3000,00"
          placeholderTextColor="#D1D5DB"
          value={totalAmount}
          onChangeText={setTotalAmount}
          keyboardType="decimal-pad"
        />
      </View>

      <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">
        {t.budget.limitPerCategory}
      </Text>

      {categories.map((cat) => {
        const catLabel = translateCategory(cat);
        return (
        <View key={cat.id} className="flex-row items-center gap-3 mb-3">
          <View
            className="w-8 h-8 rounded-lg items-center justify-center"
            style={{ backgroundColor: `${cat.color}20` }}
          >
            <Text className="text-xs font-bold" style={{ color: cat.color }}>
              {catLabel.charAt(0)}
            </Text>
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400 w-28" numberOfLines={1}>
            {catLabel}
          </Text>
          <TextInput
            className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 text-right"
            placeholder="0,00"
            placeholderTextColor="#D1D5DB"
            value={allocations[cat.id] ?? ""}
            onChangeText={(val) =>
              setAllocations((prev) => ({ ...prev, [cat.id]: val }))
            }
            keyboardType="decimal-pad"
          />
        </View>
        );
      })}

      <View className="flex-row gap-3 mt-4 mb-8">
        {!isNew && (
          <TouchableOpacity
            onPress={onDone}
            className="px-6 py-4 rounded-2xl"
          >
            <Text className="text-gray-500 font-semibold">{t.common.cancel}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSave}
          disabled={createBudget.isPending}
          className="flex-1 bg-pink-primary rounded-2xl py-4 items-center"
          activeOpacity={0.8}
        >
          {createBudget.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">{t.budget.saveBudget}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
