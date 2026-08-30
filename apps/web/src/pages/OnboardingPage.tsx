import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCreateCouple, useJoinCouple, useProfile, useI18n } from "@paca/api";
import { isValidInviteCode, normalizeInviteCode } from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Heart, UserPlus, Users } from "lucide-react";

type Step = "welcome" | "choice" | "create" | "join";

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { t } = useI18n();
  const createCouple = useCreateCouple();
  const joinCouple = useJoinCouple();

  const [step, setStep] = useState<Step>("welcome");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // If user already has a couple, redirect — except on the "create" step:
  // creating a couple sets couple_id via the profile refetch, and the user
  // still needs to read/copy the invite code before leaving.
  if (profile?.couple_id && step !== "create") {
    return <Navigate to="/" replace />;
  }

  const handleCreate = async () => {
    setError("");
    try {
      const result = await createCouple.mutateAsync();
      setGeneratedCode(result.invite_code);
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
    setError("");
    const normalized = normalizeInviteCode(inviteCode);

    if (!isValidInviteCode(normalized)) {
      setError(t.onboarding.invalidCode);
      return;
    }

    try {
      await joinCouple.mutateAsync(normalized);
      navigate("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("COUPLE_FULL")) setError(t.onboarding.coupleFull);
      else if (message.includes("ALREADY_IN_COUPLE"))
        setError(t.onboarding.alreadyInCouple);
      else setError(t.onboarding.codeNotFound);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the code stays visible for manual copy
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Welcome */}
        {step === "welcome" && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-primary to-pink-light rounded-3xl flex items-center justify-center shadow-lg shadow-pink-primary/25">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-gray-800 dark:text-gray-100 mb-3">
              {t.onboarding.hello}, {profile?.display_name ?? ""}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-10 text-lg">
              {t.onboarding.setupCouple}
            </p>
            <Button size="lg" fullWidth onClick={() => setStep("choice")}>
              {t.onboarding.start}
            </Button>
          </div>
        )}

        {/* Choice */}
        {step === "choice" && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">
              {t.onboarding.howToStart}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
              {t.onboarding.createOrJoin}
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 border border-red-200 dark:border-red-primary/20 text-red-primary text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleCreate}
                disabled={createCouple.isPending}
                className="w-full p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-primary dark:hover:border-pink-primary transition-all duration-200 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center group-hover:bg-pink-100 dark:group-hover:bg-pink-primary/20 transition-colors">
                    <UserPlus className="w-6 h-6 text-pink-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      {t.onboarding.createCouple}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.onboarding.createCoupleDesc}
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStep("join")}
                className="w-full p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-pink-primary dark:hover:border-pink-primary transition-all duration-200 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center group-hover:bg-pink-100 dark:group-hover:bg-pink-primary/20 transition-colors">
                    <Users className="w-6 h-6 text-pink-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                      {t.onboarding.haveCode}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t.onboarding.haveCodeDesc}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Created - show code */}
        {step === "create" && (
          <div className="text-center animate-fadeIn">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-primary to-emerald-400 rounded-3xl flex items-center justify-center shadow-lg">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
              {t.onboarding.coupleCreated}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {t.onboarding.sendCode}
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6">
              <p className="text-sm text-gray-500 mb-2">{t.onboarding.inviteCode}</p>
              <p className="text-4xl font-display font-bold tracking-widest text-pink-primary">
                {generatedCode}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" fullWidth onClick={copyCode}>
                {copied ? t.onboarding.copied : t.onboarding.copyCode}
              </Button>
              <Button fullWidth onClick={() => navigate("/")}>
                {t.onboarding.goToApp}
              </Button>
            </div>

            <p className="mt-6 text-sm text-gray-400">
              {t.onboarding.partnerCanEnter}
            </p>
          </div>
        )}

        {/* Join - enter code */}
        {step === "join" && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 mb-2 text-center">
              {t.onboarding.joinCouple}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
              {t.onboarding.enterCodeFromPartner}
            </p>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 border border-red-200 dark:border-red-primary/20 text-red-primary text-sm">
                {error}
              </div>
            )}

            <Input
              label={t.onboarding.codeLabel}
              placeholder="PACA-XXXX"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="text-center text-2xl tracking-widest font-display"
            />

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("choice");
                  setError("");
                }}
              >
                {t.common.back}
              </Button>
              <Button
                fullWidth
                loading={joinCouple.isPending}
                onClick={handleJoin}
              >
                {t.onboarding.enter}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
