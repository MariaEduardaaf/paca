import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useProfile,
  useCouple,
  useAskAdvisor,
  useCategories,
  usePurchaseAdviceHistory,
  useShareAdvice,
  useI18n,
  useAppStore,
  QuotaExceededError,
} from "@paca/api";
import { parseMoneyInput } from "@paca/shared";
import type { PurchaseAdvice, AdviceUrgency, AdviceVerdict } from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ArrowLeft,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  Lock,
  Loader2,
} from "lucide-react";

type VerdictVisual = {
  icon: typeof CheckCircle2;
  headlineKey: AdviceVerdict;
  className: string;
};

const VERDICT_VISUALS: Record<AdviceVerdict, VerdictVisual> = {
  go: {
    icon: CheckCircle2,
    headlineKey: "go",
    className: "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white",
  },
  wait: {
    icon: AlertCircle,
    headlineKey: "wait",
    className: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  },
  avoid: {
    icon: XCircle,
    headlineKey: "avoid",
    className: "bg-gradient-to-br from-rose-400 to-red-500 text-white",
  },
};

export function AdvisorPage() {
  const navigate = useNavigate();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!item.trim()) {
      setError(t.advisor.missingItem);
      return;
    }
    const cents = parseMoneyInput(amount);
    if (cents == null) {
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
    } catch (err) {
      // Monthly quota reached: say so instead of a generic failure
      if (err instanceof QuotaExceededError) {
        setError(t.premium.subtitleAdvisor);
      } else {
        setError(t.advisor.genericError);
      }
    }
  };

  const handleShare = async () => {
    if (!result) return;
    setError("");
    try {
      const updated = await share.mutateAsync({ id: result.id, shared: true });
      setResult(updated);
    } catch {
      setError(t.advisor.genericError);
    }
  };

  const pastAdvices = useMemo(() => history ?? [], [history]);

  return (
    <div className="max-w-3xl mx-auto page-enter min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 min-w-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
          aria-label={t.common.back}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
            {t.advisor.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 line-clamp-2">
            {t.advisor.subtitle}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 border border-red-200 dark:border-red-primary/20 text-red-primary text-sm">
          {error}
        </div>
      )}

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-5 mb-10">
          <Input
            label={t.advisor.itemLabel}
            placeholder={t.advisor.itemPlaceholder}
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />

          <Input
            label={t.advisor.amountLabel}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.advisor.categoryLabel}
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all"
            >
              <option value="">{t.advisor.categoryNone}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {translateCategory(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.advisor.urgencyLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["now", "this_month", "just_thinking"] as AdviceUrgency[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setUrgency(key)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    urgency === key
                      ? "border-pink-primary bg-pink-50 dark:bg-pink-primary/10 text-pink-primary"
                      : "border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600"
                  }`}
                >
                  {t.advisor.urgency[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.advisor.notesLabel}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.advisor.notesPlaceholder}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all resize-none"
            />
          </div>

          <Button type="submit" fullWidth loading={ask.isPending}>
            <Sparkles className="w-4 h-4" />
            {ask.isPending ? t.advisor.submitting : t.advisor.submit}
          </Button>
        </form>
      ) : (
        <AdviceResultCard
          advice={result}
          onNew={resetForm}
          onShare={handleShare}
          sharing={share.isPending}
          partnerName={couple?.partner?.display_name}
        />
      )}

      {/* History */}
      <div className="mt-10">
        <h2 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 mb-4">
          {t.advisor.history}
        </h2>
        {pastAdvices.length === 0 ? (
          <p className="text-sm text-gray-400">{t.advisor.noHistory}</p>
        ) : (
          <div className="space-y-3">
            {pastAdvices.map((a) => (
              <HistoryRow
                key={a.id}
                advice={a}
                onClick={() => setResult(a)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Result card ----------

interface AdviceResultCardProps {
  advice: PurchaseAdvice;
  onNew: () => void;
  onShare: () => void;
  sharing: boolean;
  partnerName?: string | null;
}

function AdviceResultCard({ advice, onNew, onShare, sharing, partnerName }: AdviceResultCardProps) {
  const { t, formatCurrency } = useI18n();
  const visual = VERDICT_VISUALS[advice.verdict];
  const VerdictIcon = visual.icon;

  return (
    <div className="space-y-5 mb-10">
      {/* Verdict hero */}
      <div className={`rounded-3xl p-6 sm:p-8 shadow-xl ${visual.className}`}>
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <VerdictIcon className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-white/80 font-semibold">
              {t.advisor.verdict[advice.verdict]}
            </p>
            <h2 className="text-xl sm:text-2xl font-display font-bold truncate">
              {t.advisor.verdictHeadline[advice.verdict]}
            </h2>
          </div>
        </div>
        <p className="text-sm sm:text-base text-white/90 leading-relaxed">
          {advice.reasoning}
        </p>
      </div>

      {/* Item + cost recap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide">{advice.item}</p>
          <p
            className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 tabular-nums truncate"
            title={formatCurrency(advice.amount)}
          >
            {formatCurrency(advice.amount)}
          </p>
          {advice.original_currency &&
            advice.original_currency !== advice.currency &&
            advice.original_amount != null && (
              <p className="text-[11px] text-gray-400 tabular-nums">
                {formatCurrency(advice.original_amount, advice.original_currency)}
              </p>
            )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
          {advice.is_shared ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {advice.is_shared ? t.advisor.sharedAlready : t.advisor.privateOnly}
          </span>
        </div>
      </div>

      {/* Impact numbers */}
      {advice.impact && <ImpactGrid impact={advice.impact} currency={advice.currency} />}

      {/* Alternatives */}
      {advice.alternatives && (
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-5 border border-blue-200 dark:border-blue-500/20 flex gap-3">
          <Lightbulb className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider font-semibold text-blue-500 mb-1">
              {t.advisor.alternatives}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              {advice.alternatives}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="ghost" onClick={onNew} fullWidth>
          {t.advisor.newConsult}
        </Button>
        {!advice.is_shared && partnerName && (
          <Button onClick={onShare} loading={sharing} fullWidth>
            <Users className="w-4 h-4" />
            {t.advisor.shareWithPartner}
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- Impact grid ----------

interface ImpactGridProps {
  impact: NonNullable<PurchaseAdvice["impact"]>;
  currency: string;
}

function ImpactGrid({ impact, currency }: ImpactGridProps) {
  const { t, formatCurrency } = useI18n();

  const rows: Array<{ label: string; value: string; highlight?: boolean }> = [];
  rows.push({
    label: t.advisor.impact.balanceNow,
    value: formatCurrency(impact.balance_now, currency),
  });
  rows.push({
    label: t.advisor.impact.balanceAfter,
    value: formatCurrency(impact.balance_after, currency),
    highlight: true,
  });
  if (impact.remaining_bills > 0) {
    rows.push({
      label: t.advisor.impact.remainingBills,
      value: formatCurrency(impact.remaining_bills, currency),
    });
  }
  if (impact.income_share_percent != null) {
    rows.push({
      label: t.advisor.impact.incomeShare,
      value: `${impact.income_share_percent}%`,
    });
  }
  if (impact.budget_usage_after_percent != null) {
    rows.push({
      label: t.advisor.impact.budgetUsage,
      value: `${impact.budget_usage_after_percent}%`,
    });
  }
  if (impact.category_spent_30d != null && impact.category_spent_30d > 0) {
    rows.push({
      label: t.advisor.impact.categorySpent30d,
      value: formatCurrency(impact.category_spent_30d, currency),
    });
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
      <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-4">
        {t.advisor.impactTitle}
      </p>
      <div className="grid grid-cols-2 gap-4">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className="text-xs text-gray-400 truncate">{row.label}</p>
            <p
              className={`text-sm font-semibold tabular-nums truncate ${
                row.highlight
                  ? "text-pink-primary"
                  : "text-gray-700 dark:text-gray-200"
              }`}
              title={row.value}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- History row ----------

interface HistoryRowProps {
  advice: PurchaseAdvice;
  onClick: () => void;
  formatCurrency: (value: number, override?: string | null) => string;
}

function HistoryRow({ advice, onClick, formatCurrency }: HistoryRowProps) {
  const { t } = useI18n();
  const visual = VERDICT_VISUALS[advice.verdict];
  const Icon = visual.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-pink-primary/30 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${visual.className}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
          {advice.item}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {t.advisor.verdict[advice.verdict]} ·{" "}
          {new Date(advice.created_at).toLocaleDateString()}
        </p>
      </div>
      <p
        className="text-sm font-semibold tabular-nums text-gray-700 dark:text-gray-300 shrink-0"
        title={formatCurrency(advice.amount)}
      >
        {formatCurrency(advice.amount)}
      </p>
    </button>
  );
}
