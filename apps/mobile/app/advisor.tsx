import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenContainer } from "../components/ScreenContainer";
import { PaywallModal, type PaywallReason } from "../components/PaywallModal";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useProfile,
  useCouple,
  useAskAdvisor,
  usePurchaseAdviceHistory,
  useShareAdvice,
  useCategories,
  useI18n,
  useAppStore,
  QuotaExceededError,
} from "@paca/api";
import { parseMoneyInput } from "@paca/shared";
import type {
  AdviceUrgency,
  AdviceVerdict,
  PurchaseAdvice,
} from "@paca/shared";

const VERDICT_COLORS: Record<AdviceVerdict, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  go: { bg: "#10B981", icon: "checkmark-circle-outline" },
  wait: { bg: "#F59E0B", icon: "alert-circle-outline" },
  avoid: { bg: "#EF4444", icon: "close-circle-outline" },
};

export default function AdvisorScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const mode = useAppStore((s) => s.mode);
  const { t, currency, locale, formatCurrency, translateCategory } = useI18n();
  const ask = useAskAdvisor();
  const share = useShareAdvice();
  const { data: history } = usePurchaseAdviceHistory(profile?.couple_id);

  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [urgency, setUrgency] = useState<AdviceUrgency>("now");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PurchaseAdvice | null>(null);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);

  // Shared hook: proper mode scoping (the old ad-hoc .or ignored scope) plus
  // the hidden_category_ids filter so soft-deleted defaults don't reappear.
  const { data: categories = [] } = useCategories(mode);

  const resetForm = () => {
    setItem("");
    setAmount("");
    setCategoryId("");
    setUrgency("now");
    setNotes("");
    setError("");
    setResult(null);
  };

  const handleSubmit = async () => {
    setError("");
    if (!item.trim()) {
      setError(t.advisor.missingItem);
      return;
    }
    // Locale-tolerant: "12,50", "12.50" and "1.234,56" all parse correctly.
    const cents = parseMoneyInput(amount);
    if (!cents) {
      setError(t.advisor.missingAmount);
      return;
    }
    try {
      const response = await ask.mutateAsync({
        item: item.trim(),
        amount: cents,
        currency,
        category_id: categoryId || null,
        urgency,
        notes: notes.trim() || null,
        language: locale,
        mode,
      });
      setResult(response);
    } catch (e) {
      if (e instanceof QuotaExceededError) setPaywall("advisor_limit");
      else setError(t.advisor.genericError);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const updated = await share.mutateAsync({ id: result.id, shared: true });
      setResult(updated);
    } catch {
      // The inline error banner only renders in the form view, so alert here.
      Alert.alert(t.common.error, t.advisor.genericError);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScreenContainer className="flex-1">
      <View className="flex-row items-center gap-3 px-6 pt-2 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-xl"
          accessibilityLabel={t.common.back}
        >
          <Ionicons name="arrow-back" size={22} color="#6B7280" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {t.advisor.title}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={2}>
            {t.advisor.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {!result ? (
          <View className="px-6 gap-4">
            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
                <Text className="text-red-500 text-sm text-center">{error}</Text>
              </View>
            ) : null}

            {/* Item */}
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                {t.advisor.itemLabel}
              </Text>
              <TextInput
                value={item}
                onChangeText={setItem}
                placeholder={t.advisor.itemPlaceholder}
                placeholderTextColor="#9CA3AF"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100"
              />
            </View>

            {/* Amount */}
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                {t.advisor.amountLabel}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100 text-lg font-semibold"
              />
            </View>

            {/* Category */}
            {categories.length > 0 && (
              <View>
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                  {t.advisor.categoryLabel}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingRight: 16 }}
                >
                  <TouchableOpacity
                    onPress={() => setCategoryId("")}
                    className={`px-4 py-2 rounded-xl border-2 ${
                      categoryId === ""
                        ? "border-pink-primary bg-pink-50 dark:bg-pink-primary/10"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        categoryId === "" ? "text-pink-primary" : "text-gray-500"
                      }`}
                    >
                      {t.advisor.categoryNone}
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => {
                    const label = translateCategory(cat);
                    const selected = categoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setCategoryId(cat.id)}
                        className={`px-4 py-2 rounded-xl border-2 ${
                          selected
                            ? "border-pink-primary bg-pink-50 dark:bg-pink-primary/10"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            selected ? "text-pink-primary" : "text-gray-500"
                          }`}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Urgency */}
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                {t.advisor.urgencyLabel}
              </Text>
              <View className="flex-row gap-2">
                {(["now", "this_month", "just_thinking"] as AdviceUrgency[]).map((key) => {
                  const selected = urgency === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setUrgency(key)}
                      className={`flex-1 py-3 rounded-xl border-2 items-center ${
                        selected
                          ? "border-pink-primary bg-pink-50 dark:bg-pink-primary/10"
                          : "border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          selected ? "text-pink-primary" : "text-gray-500"
                        }`}
                      >
                        {t.advisor.urgency[key]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View>
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                {t.advisor.notesLabel}
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={t.advisor.notesPlaceholder}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-gray-100"
                style={{ textAlignVertical: "top", minHeight: 80 }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={ask.isPending}
              className="bg-pink-primary rounded-2xl py-4 items-center flex-row justify-center gap-2 mt-2"
              activeOpacity={0.8}
            >
              {ask.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text className="text-white font-semibold">{t.advisor.submit}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <AdviceResultView
            advice={result}
            onNew={resetForm}
            onShare={handleShare}
            sharing={share.isPending}
            partnerName={couple?.partner?.display_name}
          />
        )}

        {/* History */}
        <View className="px-6 mt-8">
          <Text className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">
            {t.advisor.history}
          </Text>
          {(history ?? []).length === 0 ? (
            <Text className="text-xs text-gray-400">{t.advisor.noHistory}</Text>
          ) : (
            <View className="gap-2">
              {(history ?? []).map((advice) => {
                const visual = VERDICT_COLORS[advice.verdict];
                return (
                  <TouchableOpacity
                    key={advice.id}
                    onPress={() => setResult(advice)}
                    className="flex-row items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: visual.bg }}
                    >
                      <Ionicons name={visual.icon} size={18} color="#fff" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold text-gray-800 dark:text-gray-100"
                        numberOfLines={1}
                      >
                        {advice.item}
                      </Text>
                      <Text className="text-xs text-gray-400" numberOfLines={1}>
                        {t.advisor.verdict[advice.verdict]} ·{" "}
                        {new Date(advice.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {formatCurrency(advice.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      </ScreenContainer>
      <PaywallModal
        visible={!!paywall}
        reason={paywall ?? "advisor_limit"}
        onClose={() => setPaywall(null)}
      />
    </SafeAreaView>
  );
}

// ---------- Result view ----------

interface AdviceResultViewProps {
  advice: PurchaseAdvice;
  onNew: () => void;
  onShare: () => void;
  sharing: boolean;
  partnerName?: string | null;
}

function AdviceResultView({ advice, onNew, onShare, sharing, partnerName }: AdviceResultViewProps) {
  const { t, formatCurrency } = useI18n();
  const visual = VERDICT_COLORS[advice.verdict];

  return (
    <View className="px-6 gap-4">
      {/* Verdict hero */}
      <View
        className="rounded-3xl p-6"
        style={{ backgroundColor: visual.bg }}
      >
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
            <Ionicons name={visual.icon} size={26} color="#fff" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] text-white/80 uppercase tracking-wider font-semibold">
              {t.advisor.verdict[advice.verdict]}
            </Text>
            <Text className="text-xl text-white font-bold" numberOfLines={1}>
              {t.advisor.verdictHeadline[advice.verdict]}
            </Text>
          </View>
        </View>
        <Text className="text-sm text-white/90 leading-5">{advice.reasoning}</Text>
      </View>

      {/* Item recap */}
      <View className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 flex-row items-center justify-between">
        <View className="flex-1 min-w-0">
          <Text className="text-[10px] text-gray-400 uppercase tracking-wider">
            {advice.item}
          </Text>
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {formatCurrency(advice.amount)}
          </Text>
          {advice.original_currency &&
            advice.original_currency !== advice.currency &&
            advice.original_amount != null && (
              <Text className="text-[10px] text-gray-400">
                {formatCurrency(advice.original_amount, advice.original_currency)}
              </Text>
            )}
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons
            name={advice.is_shared ? "people-outline" : "lock-closed-outline"}
            size={14}
            color="#9CA3AF"
          />
        </View>
      </View>

      {/* Impact grid */}
      {advice.impact && (
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <Text className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-3">
            {t.advisor.impactTitle}
          </Text>
          <View className="flex-row flex-wrap gap-y-3">
            <ImpactCell
              label={t.advisor.impact.balanceNow}
              value={formatCurrency(advice.impact.balance_now, advice.currency)}
            />
            <ImpactCell
              label={t.advisor.impact.balanceAfter}
              value={formatCurrency(advice.impact.balance_after, advice.currency)}
              highlight
            />
            {advice.impact.remaining_bills > 0 && (
              <ImpactCell
                label={t.advisor.impact.remainingBills}
                value={formatCurrency(advice.impact.remaining_bills, advice.currency)}
              />
            )}
            {advice.impact.income_share_percent != null && (
              <ImpactCell
                label={t.advisor.impact.incomeShare}
                value={`${advice.impact.income_share_percent}%`}
              />
            )}
            {advice.impact.budget_usage_after_percent != null && (
              <ImpactCell
                label={t.advisor.impact.budgetUsage}
                value={`${advice.impact.budget_usage_after_percent}%`}
              />
            )}
          </View>
        </View>
      )}

      {/* Alternatives */}
      {advice.alternatives ? (
        <View className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 border border-blue-200 dark:border-blue-500/20 flex-row gap-3">
          <Ionicons name="bulb-outline" size={18} color="#3B82F6" />
          <View className="flex-1">
            <Text className="text-[10px] uppercase tracking-wider font-semibold text-blue-500 mb-1">
              {t.advisor.alternatives}
            </Text>
            <Text className="text-sm text-gray-700 dark:text-gray-200 leading-5">
              {advice.alternatives}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Actions */}
      <View className="gap-2">
        <TouchableOpacity
          onPress={onNew}
          className="border border-gray-200 dark:border-gray-700 rounded-2xl py-3 items-center"
          activeOpacity={0.8}
        >
          <Text className="text-gray-600 dark:text-gray-300 font-semibold text-sm">
            {t.advisor.newConsult}
          </Text>
        </TouchableOpacity>
        {!advice.is_shared && partnerName ? (
          <TouchableOpacity
            onPress={onShare}
            disabled={sharing}
            className="bg-pink-primary rounded-2xl py-3 items-center flex-row justify-center gap-2"
            activeOpacity={0.8}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="people-outline" size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm">
                  {t.advisor.shareWithPartner}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function ImpactCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View className="w-1/2 pr-2">
      <Text className="text-[10px] text-gray-400" numberOfLines={1}>
        {label}
      </Text>
      <Text
        className={`text-sm font-semibold ${
          highlight ? "text-pink-primary" : "text-gray-700 dark:text-gray-200"
        }`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
