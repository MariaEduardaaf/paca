import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useProfile, useCouple, useAddTransaction, useCategories, useI18n, useAppStore } from "@paca/api";
import { getTodayLocal, parseMoneyInput } from "@paca/shared";
import type { TransactionType } from "@paca/shared";

export default function AddTransaction() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const mode = useAppStore((s) => s.mode);
  const { t, translateCategory } = useI18n();
  const addTransaction = useAddTransaction();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  // LOCAL date: toISOString() is the UTC day, which lands evening entries in
  // UTC-negative timezones on tomorrow (and next month at the month edge).
  const [date, setDate] = useState(getTodayLocal());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Shared hook: same scoping as everywhere else, plus the hidden_category_ids
  // filter so soft-deleted defaults don't reappear in this picker.
  const { data: categories = [] } = useCategories(mode);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const handleSubmit = async () => {
    setError("");

    // Locale-tolerant: handles "12,50", "12.50" and "1.234,56" (the old
    // comma-only replace truncated thousands input to R$1,23).
    const amountCents = parseMoneyInput(amount);
    if (!amountCents) {
      setError(t.transactions.invalidAmount);
      return;
    }
    if (!description.trim()) {
      setError(t.transactions.descriptionRequired);
      return;
    }
    if (!categoryId) {
      setError(t.transactions.selectCategory);
      return;
    }

    try {
      await addTransaction.mutateAsync({
        couple_id: profile!.couple_id!,
        paid_by: profile!.id,
        scope: mode,
        type,
        amount: amountCents,
        // Without this the DB default stamps 'BRL' even for non-BRL couples.
        currency: couple?.primary_currency ?? "BRL",
        description: description.trim(),
        category_id: categoryId,
        date,
        notes: notes || null,
      });
      router.back();
    } catch {
      setError(t.transactions.saveError);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1"
            accessibilityRole="button"
            accessibilityLabel={t.common.close}
          >
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 flex-1">
            {t.transactions.newTransaction}
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/scan")}
            className="flex-row items-center gap-1.5 bg-pink-50 dark:bg-pink-900/20 px-3 py-2 rounded-xl"
          >
            <Ionicons name="scan-outline" size={16} color="#FF8FB1" />
            <Text className="text-pink-primary text-sm font-semibold">
              {t.transactions.scan}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
          {/* Advisor shortcut */}
          <TouchableOpacity
            onPress={() => router.push("/advisor")}
            className="flex-row items-center gap-2 mt-4 self-start px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10"
            activeOpacity={0.8}
          >
            <Ionicons name="bulb-outline" size={14} color="#6366F1" />
            <Text className="text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
              {t.advisor.linkShortcut}
            </Text>
          </TouchableOpacity>

          {error ? (
            <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mt-4">
              <Text className="text-red-500 text-sm text-center">{error}</Text>
            </View>
          ) : null}

          {/* Type toggle */}
          <View className="flex-row gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mt-6">
            <TouchableOpacity
              onPress={() => setType("expense")}
              className={`flex-1 py-3 rounded-lg items-center ${
                type === "expense" ? "bg-red-500 shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  type === "expense" ? "text-white" : "text-gray-400"
                }`}
              >
                {t.transactions.expense}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType("income")}
              className={`flex-1 py-3 rounded-lg items-center ${
                type === "income" ? "bg-emerald-500 shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  type === "income" ? "text-white" : "text-gray-400"
                }`}
              >
                {t.transactions.income}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View className="mt-6">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              {t.transactions.amountCurrency}
            </Text>
            <TextInput
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-3xl font-bold text-center text-gray-800 dark:text-gray-100"
              placeholder="0,00"
              placeholderTextColor="#D1D5DB"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Description */}
          <View className="mt-4">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              {t.transactions.description}
            </Text>
            <TextInput
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-gray-800 dark:text-gray-100"
              placeholder={t.transactions.descriptionPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Categories */}
          <View className="mt-4">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
              {t.transactions.category}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => {
                const catLabel = translateCategory(cat);
                return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl border-2 ${
                    categoryId === cat.id
                      ? "border-pink-primary bg-pink-50 dark:bg-pink-900/20"
                      : "border-gray-100 dark:border-gray-700"
                  }`}
                >
                  <View
                    className="w-6 h-6 rounded-lg items-center justify-center"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: cat.color }}
                    >
                      {catLabel.charAt(0)}
                    </Text>
                  </View>
                  <Text
                    className={`text-sm font-medium ${
                      categoryId === cat.id
                        ? "text-pink-primary"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {catLabel}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          <View className="mt-4">
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
              {t.transactions.notes}
            </Text>
            <TextInput
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3.5 text-gray-800 dark:text-gray-100"
              placeholder={t.transactions.notesPlaceholder}
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={addTransaction.isPending}
            className="bg-pink-primary rounded-2xl py-4 items-center mt-6 mb-8"
            activeOpacity={0.8}
          >
            {addTransaction.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {t.transactions.addTransaction}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
