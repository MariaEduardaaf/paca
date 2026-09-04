import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenContainer } from "../components/ScreenContainer";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useI18n,
  useAppStore,
} from "@paca/api";
import type { Category } from "@paca/shared";

const PALETTE = [
  "#F472B6",
  "#FB7185",
  "#F59E0B",
  "#34D399",
  "#60A5FA",
  "#A78BFA",
  "#F97316",
  "#10B981",
  "#0EA5E9",
];

export default function CategoriesScreen() {
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const { data: categories = [], isLoading } = useCategories(mode);
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const { t, translateCategory, locale } = useI18n();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const custom = categories.filter((c) => !c.is_default);
  const defaults = categories.filter((c) => c.is_default);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await createCategory.mutateAsync({
        name: trimmed,
        icon: trimmed.charAt(0).toUpperCase(),
        color,
        locale,
        mode,
      });
      setName("");
      setColor(PALETTE[0]);
      setAdding(false);
    } catch (err) {
      console.error(err);
      Alert.alert(t.common.error, t.common.actionError);
    }
  };

  const handleDelete = (cat: Category) => {
    Alert.alert(t.categoryManager.title, t.categoryManager.deleteConfirm, [
      { text: t.categoryManager.cancel, style: "cancel" },
      {
        text: t.common.delete,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCategory.mutateAsync({
              id: cat.id,
              is_default: cat.is_default,
            });
          } catch (err) {
            console.error(err);
            Alert.alert(t.common.error, t.common.actionError);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={["top"]}>
      <ScreenContainer className="flex-1">
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <Ionicons name="arrow-back" size={22} color="#9CA3AF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
            {t.categoryManager.title}
          </Text>
          <Text className="text-xs text-gray-500">
            {t.categoryManager.description}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Custom */}
        <View className="mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {custom.map((cat) => (
            <CategoryRow
              key={cat.id}
              category={cat}
              label={translateCategory(cat)}
              onDelete={() => handleDelete(cat)}
            />
          ))}

          {adding ? (
            <View className="px-5 py-4 border-t border-gray-50 dark:border-gray-700/50">
              <TextInput
                autoFocus
                placeholder={t.categoryManager.newCategoryPlaceholder}
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100"
              />
              <Text className="text-xs font-medium text-gray-500 mt-3 mb-2">
                {t.categoryManager.color}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    style={{
                      backgroundColor: c,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      borderWidth: color === c ? 3 : 0,
                      borderColor: "#F472B6",
                    }}
                  />
                ))}
              </View>
              <View className="flex-row gap-2 mt-4">
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={!name.trim() || createCategory.isPending}
                  className={`flex-1 py-3 rounded-xl items-center ${
                    name.trim() ? "bg-pink-primary" : "bg-gray-300"
                  }`}
                >
                  {createCategory.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold">
                      {t.categoryManager.create}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setAdding(false);
                    setName("");
                  }}
                  className="px-4 py-3 rounded-xl items-center justify-center"
                >
                  <Text className="text-gray-500 font-medium">
                    {t.categoryManager.cancel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              className="flex-row items-center gap-3 px-5 py-4 border-t border-gray-50 dark:border-gray-700/50"
            >
              <Ionicons name="add" size={18} color="#EC4899" />
              <Text className="text-sm font-medium text-pink-primary">
                {t.categoryManager.addCategory}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Defaults */}
        {!isLoading && (
          <View className="mx-4 mt-4 mb-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {defaults.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                label={translateCategory(cat)}
                defaultBadge={t.categoryManager.defaultBadge}
                onDelete={() => handleDelete(cat)}
              />
            ))}
          </View>
        )}
      </ScrollView>
      </ScreenContainer>
    </SafeAreaView>
  );
}

function CategoryRow({
  category,
  label,
  onDelete,
  defaultBadge,
}: {
  category: Category;
  label: string;
  onDelete?: () => void;
  defaultBadge?: string;
}) {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50">
      <View
        style={{
          backgroundColor: `${category.color}20`,
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: category.color, fontWeight: "bold" }}>
          {label.charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {label}
        </Text>
      </View>
      {defaultBadge && (
        <Text className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
          {defaultBadge}
        </Text>
      )}
      {onDelete && (
        <TouchableOpacity
          onPress={onDelete}
          className="p-2"
          accessibilityRole="button"
          accessibilityLabel={t.common.delete}
        >
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
}
