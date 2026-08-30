import { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useProfile, useBills, useCreateBill, useToggleBill, useDeleteBill, useI18n } from "@paca/api";
import {
  getCurrentMonth,
  parseMoneyInput,
  type BillWithPayment,
} from "@paca/shared";
import { ErrorState } from "../../components/ErrorState";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function Bills() {
  const { t, formatCurrency, formatMonthYear } = useI18n();
  const { data: profile } = useProfile();
  const coupleId = profile?.couple_id ?? "";

  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);

  const { data: bills, isLoading, isError, refetch } = useBills({ coupleId, month });
  const toggleBill = useToggleBill();
  const deleteBill = useDeleteBill();

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

  const handleToggle = async (bill: BillWithPayment) => {
    if (!profile) return;
    const newPaid = !bill.payment?.paid;
    try {
      await toggleBill.mutateAsync({
        billId: bill.id,
        month,
        paid: newPaid,
        profileId: profile.id,
      });
    } catch {
      Alert.alert(t.common.error, t.common.actionError);
    }
  };

  const handleDelete = (bill: BillWithPayment) => {
    Alert.alert(
      t.bills.deleteBill,
      `${t.bills.deleteConfirm}`,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBill.mutateAsync(bill.id);
            } catch {
              Alert.alert(t.common.error, t.common.actionError);
            }
          },
        },
      ]
    );
  };

  const { totalAmount, paidAmount, paidCount, totalCount } = useMemo(() => {
    if (!bills) return { totalAmount: 0, paidAmount: 0, paidCount: 0, totalCount: 0 };
    let total = 0;
    let paid = 0;
    let paidC = 0;
    for (const b of bills) {
      total += b.amount;
      if (b.payment?.paid) {
        paid += b.amount;
        paidC++;
      }
    }
    return { totalAmount: total, paidAmount: paid, paidCount: paidC, totalCount: bills.length };
  }, [bills]);

  const pendingAmount = totalAmount - paidAmount;
  const progressPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScreenContainer className="flex-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          {t.bills.title}
        </Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <View className="flex-row items-center gap-1 bg-pink-primary rounded-xl px-3 py-2">
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white text-sm font-semibold">{t.common.new}</Text>
          </View>
        </TouchableOpacity>
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

      {/* Summary cards */}
      {(bills?.length ?? 0) > 0 && (
        <View className="px-6 mb-4">
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700">
              <Text className="text-xs text-gray-400 mb-1">{t.bills.totalMonth}</Text>
              <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(totalAmount)}
              </Text>
            </View>
            <View className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-3 border border-emerald-200 dark:border-emerald-500/20">
              <Text className="text-xs text-gray-400 mb-1">
                {t.bills.paidCount} ({paidCount}/{totalCount})
              </Text>
              <Text className="text-base font-bold text-emerald-500">
                {formatCurrency(paidAmount)}
              </Text>
            </View>
          </View>
          <View
            className={`rounded-2xl p-3 border ${
              pendingAmount > 0
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-gray-400 mb-1">{t.bills.pending}</Text>
                <Text
                  className={`text-base font-bold ${
                    pendingAmount > 0 ? "text-amber-500" : "text-emerald-500"
                  }`}
                >
                  {formatCurrency(pendingAmount)}
                </Text>
              </View>
              <View>
                <Text className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {progressPercent}%
                </Text>
              </View>
            </View>
            <View className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
              <View
                className="h-full rounded-full bg-pink-primary"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
          </View>
        </View>
      )}

      {/* New bill form */}
      {showForm && (
        <NewBillForm
          coupleId={coupleId}
          onDone={() => setShowForm(false)}
        />
      )}

      {/* Bills list */}
      <FlatList
        data={bills}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator color="#FF8FB1" />
            </View>
          ) : isError ? (
            <ErrorState onRetry={refetch} />
          ) : (
            <View className="items-center py-12">
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="receipt-outline" size={24} color="#FF8FB1" />
              </View>
              <Text className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                {t.bills.noBills}
              </Text>
              <Text className="text-gray-400 text-xs text-center px-8">
                {t.bills.noBillsDesc}
              </Text>
            </View>
          )
        }
        renderItem={({ item: bill }) => (
          <BillRow
            bill={bill}
            onToggle={() => handleToggle(bill)}
            onDelete={() => handleDelete(bill)}
          />
        )}
      />
      </ScreenContainer>
    </SafeAreaView>
  );
}

function BillRow({
  bill,
  onToggle,
  onDelete,
}: {
  bill: BillWithPayment;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t, formatCurrency } = useI18n();
  const isPaid = bill.payment?.paid ?? false;

  return (
    <TouchableOpacity
      onLongPress={onDelete}
      activeOpacity={0.7}
      className="flex-row items-center gap-3 py-3.5 border-b border-gray-100 dark:border-gray-700/50"
    >
      {/* Checkbox */}
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={isPaid ? t.bills.unmarkAsPaid : t.bills.markAsPaid}
      >
        <View
          className={`w-7 h-7 rounded-lg border-2 items-center justify-center ${
            isPaid
              ? "bg-emerald-500 border-emerald-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          {isPaid && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>

      {/* Bill info */}
      <View className="flex-1 min-w-0">
        <Text
          className={`text-sm font-medium ${
            isPaid
              ? "text-gray-400 line-through"
              : "text-gray-800 dark:text-gray-100"
          }`}
          numberOfLines={1}
        >
          {bill.name}
        </Text>
        <Text className="text-xs text-gray-400">
          {t.bills.dueDay} {bill.due_day}
          {bill.is_fixed ? ` · ${t.bills.fixed}` : ""}
        </Text>
      </View>

      {/* Amount */}
      <Text
        className={`text-sm font-semibold ${
          isPaid ? "text-emerald-500" : "text-gray-700 dark:text-gray-300"
        }`}
      >
        {formatCurrency(bill.amount)}
      </Text>
    </TouchableOpacity>
  );
}

function NewBillForm({
  coupleId,
  onDone,
}: {
  coupleId: string;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const createBill = useCreateBill();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");

    if (!name.trim()) {
      setError(t.bills.nameRequired);
      return;
    }

    // Locale-tolerant parser: "12.50", "12,50" and "1.234,56" all parse
    // correctly (the old dot-stripping turned "12.50" into 1250 units).
    const amountCents = parseMoneyInput(amount);
    if (!amountCents) {
      setError(t.bills.invalidAmount);
      return;
    }

    const day = parseInt(dueDay);
    if (!day || day < 1 || day > 31) {
      setError(t.bills.invalidDay);
      return;
    }

    try {
      await createBill.mutateAsync({
        couple_id: coupleId,
        name: name.trim(),
        amount: amountCents,
        due_day: day,
        is_fixed: true,
      });
      onDone();
    } catch {
      setError(t.bills.createError);
    }
  };

  return (
    <View className="mx-6 mb-4 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-pink-primary/30 p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Ionicons name="receipt-outline" size={18} color="#FF8FB1" />
        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {t.bills.newBillTitle}
        </Text>
      </View>

      {error ? (
        <View className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-3">
          <Text className="text-red-500 text-sm text-center">{error}</Text>
        </View>
      ) : null}

      <View className="gap-3 mb-4">
        <TextInput
          className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100"
          placeholder={t.bills.namePlaceholder}
          placeholderTextColor="#9CA3AF"
          value={name}
          onChangeText={setName}
        />
        <View className="flex-row gap-3">
          <TextInput
            className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100"
            placeholder={t.bills.amountPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <TextInput
            className="w-24 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 text-center"
            placeholder={t.bills.dayPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={dueDay}
            onChangeText={setDueDay}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onDone}
          className="flex-1 py-3.5 rounded-xl items-center"
        >
          <Text className="text-gray-500 font-semibold">{t.common.cancel}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={createBill.isPending}
          className="flex-1 bg-pink-primary rounded-xl py-3.5 items-center"
          activeOpacity={0.8}
        >
          {createBill.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">{t.common.add}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
