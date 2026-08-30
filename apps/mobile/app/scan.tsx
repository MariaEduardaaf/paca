import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import {
  useProfile,
  useAddTransaction,
  useScanReceipt,
  useScanStatement,
  useCategories,
  useI18n,
  useAppStore,
  QuotaExceededError,
} from "@paca/api";
import { getTodayLocal } from "@paca/shared";
import { PaywallModal, type PaywallReason } from "../components/PaywallModal";

type Mode = "choose" | "single" | "batch";
type ScanStep = "upload" | "scanning" | "review";

interface ScannedTransaction {
  amount: number;
  currency?: string;
  original_amount?: number;
  original_currency?: string;
  exchange_rate?: number;
  description: string;
  category: string;
  date: string;
  type: "income" | "expense";
  confidence: number;
  selected?: boolean;
}

export default function ScanScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const financeMode = useAppStore((s) => s.mode);
  const addTransaction = useAddTransaction();
  const scanReceipt = useScanReceipt();
  const scanStatement = useScanStatement();
  const { t, translateCategory, formatCurrency } = useI18n();

  const [mode, setMode] = useState<Mode>("choose");
  const [step, setStep] = useState<ScanStep>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedTransaction[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);

  // Shared hook: same couple/personal scoping as everywhere else, plus the
  // hidden_category_ids filter so soft-deleted defaults don't reappear here.
  const { data: categories = [] } = useCategories(financeMode);

  const pickImage = async (useCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          if (!perm.canAskAgain) {
            Alert.alert(t.common.error, t.scan.permissionError, [
              { text: t.common.cancel, style: "cancel" },
              { text: t.scan.openSettings, onPress: () => Linking.openSettings() },
            ]);
          } else {
            setError(t.scan.permissionError);
          }
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.6,
        });
      } else {
        // No base64 here: reading each image lazily inside the loop keeps a
        // single base64 string in memory at a time instead of up to 20.
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.6,
          allowsMultipleSelection: true,
          selectionLimit: 20,
        });
      }
    } catch {
      setError(t.scan.permissionError);
      return;
    }

    if (result.canceled || !result.assets?.length) return;

    const uris = result.assets.map((a) => a.uri);

    setPreview(uris[0]);
    setStep("scanning");
    setError("");
    setScannedItems([]);
    setScanProgress({ done: 0, total: uris.length });

    const allItems: ScannedTransaction[] = [];
    let failures = 0;
    let quotaHit = false;

    for (const uri of uris) {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (mode === "single") {
          const data = await scanReceipt.mutateAsync({ image: base64, mode: financeMode });
          const valid = Number.isFinite(data.amount) && Math.abs(data.amount) > 0;
          if (data && data.amount != null) {
            allItems.push({ ...data, selected: valid });
          }
        } else {
          const data = await scanStatement.mutateAsync({ image: base64, mode: financeMode });
          for (const tx of data.transactions) {
            allItems.push({
              ...tx,
              selected: Number.isFinite(tx.amount) && Math.abs(tx.amount) > 0,
            });
          }
        }
      } catch (e) {
        if (e instanceof QuotaExceededError) { quotaHit = true; break; }
        failures++;
      } finally {
        setScanProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    }

    if (quotaHit) {
      // Quota was already consumed for the scans that succeeded — keep those
      // results reviewable instead of throwing them away with the paywall.
      if (allItems.length > 0) {
        setScannedItems(allItems);
        setStep("review");
      } else {
        setStep("upload");
      }
      setPaywall("scan_limit");
      return;
    }

    if (allItems.length === 0) {
      setError(t.scan.imageError);
      setStep("upload");
      return;
    }

    setScannedItems(allItems);
    if (failures > 0) setError(t.scan.imageError);
    setStep("review");
  };

  const getCategoryId = (name: string) => {
    const target = name.toLowerCase().trim();
    const found = categories.find((c) => {
      if (c.name.toLowerCase() === target) return true;
      const translations = c.name_translations ?? {};
      return Object.values(translations).some(
        (v) => typeof v === "string" && v.toLowerCase() === target
      );
    });
    return found?.id ?? categories[0]?.id ?? "";
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    // Filter out rows with invalid/zero amounts — DB has CHECK (amount > 0)
    const selected = scannedItems.filter(
      (it) => it.selected && Number.isFinite(it.amount) && Math.abs(it.amount) > 0
    );
    if (selected.length === 0) {
      setError(t.scan.saveError);
      setSaving(false);
      return;
    }
    // Track per-item failures so a mid-batch error doesn't leave already-saved
    // rows in the list (a retry would then insert duplicates).
    const failed = new Set<ScannedTransaction>();
    for (const it of selected) {
      try {
        await addTransaction.mutateAsync({
          couple_id: profile!.couple_id!,
          paid_by: profile!.id,
          scope: financeMode,
          type: it.type,
          // Round: the AI occasionally emits fractional "cents" that a bigint
          // column rejects, failing the insert.
          amount: Math.round(Math.abs(it.amount)),
          currency: it.currency,
          original_amount:
            it.original_amount != null ? Math.round(Math.abs(it.original_amount)) : null,
          original_currency: it.original_currency,
          exchange_rate: it.exchange_rate,
          description: it.description,
          category_id: getCategoryId(it.category),
          date: it.date ?? getTodayLocal(),
          ai_scanned: true,
        });
      } catch {
        failed.add(it);
      }
    }
    setSaving(false);
    if (failed.size === 0) {
      router.back();
      return;
    }
    // Keep only the failed rows (and any rows the user chose not to save) so
    // tapping save again retries just the failures.
    setScannedItems(scannedItems.filter((it) => !it.selected || failed.has(it)));
    setError(t.scan.partialSaveError);
  };

  const toggleItem = (i: number) => {
    setScannedItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const errorBanner = error ? (
    <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mt-4">
      <Text className="text-red-500 text-sm text-center">{error}</Text>
    </View>
  ) : null;

  const renderReviewItem = ({
    item,
    index: i,
  }: {
    item: ScannedTransaction;
    index: number;
  }) => (
    <View
      className={`bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-3 border-2 ${
        item.selected
          ? "border-pink-primary/30"
          : "border-gray-100 dark:border-gray-700 opacity-50"
      }`}
    >
      <View className="flex-row items-start justify-between mb-2">
        <TouchableOpacity
          onPress={() => toggleItem(i)}
          className="flex-row items-center gap-3 flex-1"
        >
          <View
            className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
              item.selected
                ? "bg-pink-primary border-pink-primary"
                : "border-gray-300 dark:border-gray-600"
            }`}
          >
            {item.selected && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {item.description}
            </Text>
            <Text className="text-xs text-gray-400">
              {translateCategory(item.category)} · {item.date} ·{" "}
              <Text className="text-pink-primary">
                {Math.round((item.confidence ?? 0) * 100)}%
              </Text>
            </Text>
          </View>
        </TouchableOpacity>
        <Text
          className={`text-sm font-bold ${
            item.type === "expense" ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {formatCurrency(item.amount, item.currency)}
        </Text>
      </View>

      {/* Confidence bar */}
      <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{
            width: `${(item.confidence ?? 0) * 100}%`,
            backgroundColor:
              (item.confidence ?? 0) >= 0.9
                ? "#34D399"
                : (item.confidence ?? 0) >= 0.7
                  ? "#FBBF24"
                  : "#F87171",
          }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => {
            if (step !== "upload" || mode !== "choose") {
              setStep("upload");
              setMode("choose");
              setPreview(null);
              setScannedItems([]);
            } else {
              router.back();
            }
          }}
          className="p-1"
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <Ionicons name="arrow-back" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {t.scan.title}
          </Text>
          <Text className="text-xs text-gray-400">
            {t.scan.subtitle}
          </Text>
        </View>
      </View>

      {step === "review" ? (
        /* Review: virtualized — a 20-image statement batch can yield hundreds
           of rows, which a plain ScrollView mounts all at once. */
        <FlatList
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
          data={scannedItems}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderReviewItem}
          ListHeaderComponent={
            <View className="mt-4">
              {errorBanner}
              <View className="flex-row items-center gap-2 mb-4 mt-2">
                <Ionicons name="sparkles" size={20} color="#FF8FB1" />
                <Text className="text-base font-bold text-gray-800 dark:text-gray-100">
                  {scannedItems.length}{" "}
                  {scannedItems.length === 1 ? t.scan.transaction : t.scan.transactions}
                </Text>
              </View>
            </View>
          }
          ListFooterComponent={
            <View className="flex-row gap-3 mt-4 mb-8">
              <TouchableOpacity
                onPress={() => {
                  setStep("upload");
                  setPreview(null);
                  setScannedItems([]);
                }}
                className="px-6 py-4 rounded-2xl"
              >
                <Text className="text-gray-500 font-semibold">{t.scan.another}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !scannedItems.some((s) => s.selected)}
                className="flex-1 bg-pink-primary rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">
                    {t.scan.saveCount} {scannedItems.filter((s) => s.selected).length}{" "}
                    {scannedItems.filter((s) => s.selected).length === 1
                      ? t.scan.transaction
                      : t.scan.transactions}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
      <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled">
        {errorBanner}

        {/* Mode choice */}
        {mode === "choose" && (
          <View className="gap-4 mt-6">
            <TouchableOpacity
              onPress={() => setMode("single")}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6"
              activeOpacity={0.7}
            >
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="camera-outline" size={28} color="#FF8FB1" />
              </View>
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {t.scan.receiptTitle}
              </Text>
              <Text className="text-sm text-gray-400">
                {t.scan.receiptDesc}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("batch")}
              className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6"
              activeOpacity={0.7}
            >
              <View className="w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-3">
                <Ionicons name="document-text-outline" size={28} color="#FF8FB1" />
              </View>
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
                {t.scan.statementTitle}
              </Text>
              <Text className="text-sm text-gray-400">
                {t.scan.statementDesc}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload options */}
        {mode !== "choose" && step === "upload" && (
          <View className="gap-4 mt-6">
            <TouchableOpacity
              onPress={() => pickImage(true)}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={36} color="#FF8FB1" />
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-3">
                {t.scan.takePhoto}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickImage(false)}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="images" size={36} color="#FF8FB1" />
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-3">
                {t.scan.chooseGallery}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scanning */}
        {step === "scanning" && (
          <View className="items-center py-16">
            <View className="w-16 h-16 rounded-2xl bg-pink-50 dark:bg-pink-900/20 items-center justify-center mb-6">
              <Ionicons name="sparkles" size={32} color="#FF8FB1" />
            </View>
            <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
              {t.scan.analyzing}
            </Text>
            {scanProgress.total > 1 && (
              <Text className="text-xs text-gray-400 mt-1">
                {scanProgress.done} / {scanProgress.total}
              </Text>
            )}
            <ActivityIndicator color="#FF8FB1" className="mt-4" />
            {preview && (
              <Image
                source={{ uri: preview }}
                className="w-48 h-64 rounded-2xl mt-8"
                resizeMode="cover"
              />
            )}
          </View>
        )}

      </ScrollView>
      )}
      <PaywallModal
        visible={!!paywall}
        reason="scan_limit"
        onClose={() => setPaywall(null)}
      />
    </SafeAreaView>
  );
}
