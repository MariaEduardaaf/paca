import { Navigate } from "react-router-dom";
import {
  useAuth,
  useProfile,
  useCouple,
  useSyncLocaleFromProfile,
  useSyncCurrencyFromCouple,
  useI18n,
} from "@paca/api";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireCouple?: boolean;
}

export function ProtectedRoute({
  children,
  requireCouple = false,
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: couple } = useCouple();
  const { t } = useI18n();
  useSyncLocaleFromProfile(profile?.language);
  useSyncCurrencyFromCouple(couple?.primary_currency);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
          <p className="text-gray-400 text-sm" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireCouple) {
    if (profile && !profile.couple_id) {
      return <Navigate to="/onboarding" replace />;
    }
    // Profile query failed (network/RLS): fail closed with a retry instead of
    // rendering couple pages with an empty couple_id.
    if (!profile) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t.common.loadError}</p>
            <button
              type="button"
              onClick={() => refetchProfile()}
              className="px-5 py-2.5 rounded-xl bg-pink-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t.common.tryAgain}
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
