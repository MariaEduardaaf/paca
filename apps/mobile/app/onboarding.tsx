import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenContainer } from "../components/ScreenContainer";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCreateCouple, useJoinCouple, useI18n } from "@paca/api";
import { isValidInviteCode, normalizeInviteCode } from "@paca/shared";

type Step = "welcome" | "choice" | "create" | "join";

export default function Onboarding() {
  const router = useRouter();
  const { t } = useI18n();
  const createCouple = useCreateCouple();
  const joinCouple = useJoinCouple();
  const [step, setStep] = useState<Step>("welcome");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const loading = createCouple.isPending || joinCouple.isPending;

  const handleCreate = async () => {
    setError("");
    try {
      // The create_couple RPC creates the couple, links this profile and
      // returns the server-generated invite code; the hook refreshes the
      // profile/couple caches so the AuthGate sees the new state.
      const { invite_code } = await createCouple.mutateAsync();
      setGeneratedCode(invite_code);
      setStep("create");
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("ALREADY_IN_COUPLE")
          ? t.onboarding.alreadyInCouple
          : t.onboarding.createError
      );
    }
  };

  const handleJoin = async () => {
    const code = normalizeInviteCode(inviteCode);
    if (!isValidInviteCode(code)) {
      setError(t.onboarding.invalidCode);
      return;
    }

    setError("");
    try {
      await joinCouple.mutateAsync(code);
      router.replace("/(tabs)");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("COUPLE_FULL")) setError(t.onboarding.coupleFull);
      else if (message.includes("ALREADY_IN_COUPLE"))
        setError(t.onboarding.alreadyInCouple);
      else setError(t.onboarding.codeNotFound);
    }
  };

  const shareCode = async () => {
    try {
      await Share.share({
        message: `${t.profile.shareInvite} ${generatedCode}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
      <ScreenContainer className="flex-1 px-8 justify-center">
        {/* Welcome */}
        {step === "welcome" && (
          <View className="items-center">
            <View className="w-20 h-20 bg-pink-primary rounded-3xl items-center justify-center mb-6">
              <Ionicons name="heart" size={40} color="#fff" />
            </View>
            <Text className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3 text-center">
              {t.onboarding.letsStart}
            </Text>
            <Text className="text-gray-400 text-base text-center mb-10">
              {t.onboarding.setupCouple}
            </Text>
            <TouchableOpacity
              onPress={() => setStep("choice")}
              className="bg-pink-primary rounded-2xl py-4 px-8 w-full items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-base">
                {t.onboarding.start}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Choice */}
        {step === "choice" && (
          <View>
            <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">
              {t.onboarding.howToStart}
            </Text>
            <Text className="text-gray-400 mb-8 text-center">
              {t.onboarding.createOrJoin}
            </Text>

            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-6">
                <Text className="text-red-500 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <View className="gap-4">
              <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex-row items-center gap-4"
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 bg-pink-50 dark:bg-pink-900/20 rounded-xl items-center justify-center">
                  <Ionicons name="person-add-outline" size={24} color="#FF8FB1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {t.onboarding.createCouple}
                  </Text>
                  <Text className="text-sm text-gray-400 mt-0.5">
                    {t.onboarding.generateCode}
                  </Text>
                </View>
                {loading && <ActivityIndicator color="#FF8FB1" />}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStep("join")}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex-row items-center gap-4"
                activeOpacity={0.7}
              >
                <View className="w-12 h-12 bg-pink-50 dark:bg-pink-900/20 rounded-xl items-center justify-center">
                  <Ionicons name="people-outline" size={24} color="#FF8FB1" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {t.onboarding.haveCode}
                  </Text>
                  <Text className="text-sm text-gray-400 mt-0.5">
                    {t.onboarding.partnerSent}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Created */}
        {step === "create" && (
          <View className="items-center">
            <View className="w-20 h-20 bg-emerald-500 rounded-3xl items-center justify-center mb-6">
              <Ionicons name="heart" size={40} color="#fff" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              {t.onboarding.coupleCreated}
            </Text>
            <Text className="text-gray-400 mb-8 text-center">
              {t.onboarding.sendCode}
            </Text>

            <View className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 w-full items-center mb-6">
              <Text className="text-sm text-gray-400 mb-2">
                {t.onboarding.codeLabel}
              </Text>
              <Text className="text-4xl font-bold text-pink-primary tracking-widest">
                {generatedCode}
              </Text>
            </View>

            <View className="flex-row gap-3 w-full">
              <TouchableOpacity
                onPress={shareCode}
                className="flex-1 border-2 border-pink-primary rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-pink-primary font-semibold">
                  {t.common.share}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)")}
                className="flex-1 bg-pink-primary rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold">{t.onboarding.goToApp}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Join */}
        {step === "join" && (
          <View>
            <Text className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">
              {t.onboarding.joinCouple}
            </Text>
            <Text className="text-gray-400 mb-8 text-center">
              {t.onboarding.enterCode}
            </Text>

            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-6">
                <Text className="text-red-500 text-sm text-center">
                  {error}
                </Text>
              </View>
            ) : null}

            <TextInput
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-center text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-widest"
              placeholder="PACA-XXXXXXXXXX"
              placeholderTextColor="#9CA3AF"
              value={inviteCode}
              onChangeText={(t) => setInviteCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={15}
            />

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => {
                  setStep("choice");
                  setError("");
                }}
                className="px-6 py-4 rounded-2xl"
                activeOpacity={0.7}
              >
                <Text className="text-gray-500 font-semibold">{t.common.back}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleJoin}
                disabled={loading}
                className="flex-1 bg-pink-primary rounded-2xl py-4 items-center"
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">{t.onboarding.enter}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScreenContainer>
    </SafeAreaView>
  );
}
