import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useI18n } from "@paca/api";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GuestRoute } from "@/components/auth/GuestRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthPage } from "@/pages/AuthPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { NewTransactionPage } from "@/pages/NewTransactionPage";
import { BudgetPage } from "@/pages/BudgetPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ScanReceiptPage } from "@/pages/ScanReceiptPage";
import { EditTransactionPage } from "@/pages/EditTransactionPage";
import { BillsPage } from "@/pages/BillsPage";
import { AdvisorPage } from "@/pages/AdvisorPage";
import { AdminUsagePage } from "@/pages/AdminUsagePage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { SupportPage } from "@/pages/SupportPage";
import { RecommendationsPage } from "@/pages/RecommendationsPage";

export function App() {
  const { dateLocale } = useI18n();

  // Keep <html lang> in sync with the active locale so screen readers use the
  // right pronunciation rules (the static attribute only covers first paint).
  useEffect(() => {
    try {
      document.documentElement.lang = dateLocale;
    } catch {
      // non-DOM environment — ignore
    }
  }, [dateLocale]);

  return (
    <Routes>
      {/* Public routes (legal + support) — no auth required */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/support" element={<SupportPage />} />

      {/* Guest routes */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <AuthPage />
          </GuestRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <GuestRoute>
            <AuthPage />
          </GuestRoute>
        }
      />

      {/* Protected - no couple required */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Protected - couple required - with sidebar */}
      <Route
        element={
          <ProtectedRoute requireCouple>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/new" element={<NewTransactionPage />} />
        <Route path="transactions/:id/edit" element={<EditTransactionPage />} />
        <Route path="budget" element={<BudgetPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="scan" element={<ScanReceiptPage />} />
        <Route path="advisor" element={<AdvisorPage />} />
        <Route path="admin/usage" element={<AdminUsagePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
