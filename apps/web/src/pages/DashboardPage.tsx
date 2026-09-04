import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfile, useCouple, useTransactions, useBudget, useRealtimeTransactions, useI18n, useAppStore, supabase } from "@paca/api";
import {
  getCurrentMonth,
  formatLocalDate,
  type TransactionWithCategory,
} from "@paca/shared";
import { splitByCurrency, formatForeignBreakdown } from "@/utils/currencyBreakdown";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CalendarDays,
  StickyNote,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationsPopover } from "@/components/NotificationsPopover";

// Greeting emoji based on time of day
function getGreetingEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "🌙";
  if (hour < 12) return "☀️";
  if (hour < 18) return "🌤️";
  return "🌙";
}

// Simple donut chart via SVG
function DonutChart({ data }: { data: { name: string; color: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const size = 140;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-4 sm:gap-6 min-w-0">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        {data.map((segment) => {
          const percent = segment.value / total;
          const strokeDasharray = `${percent * circumference} ${circumference}`;
          const strokeDashoffset = -cumulativePercent * circumference;
          cumulativePercent += percent;

          return (
            <circle
              key={segment.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      <div className="flex-1 min-w-0 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{d.name}</span>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-auto">
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Budget mini progress bar
function BudgetProgress({ spent, total }: { spent: number; total: number }) {
  const { t, formatCurrency, formatCurrencyCompact } = useI18n();
  const percent = total > 0 ? Math.min(Math.round((spent / total) * 100), 100) : 0;
  const isOver = spent > total;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{t.dashboard.monthBudget}</span>
        <Link to="/budget" className="text-xs text-pink-primary font-semibold hover:underline shrink-0">
          {t.dashboard.seeDetails}
        </Link>
      </div>
      <div className="flex items-end justify-between gap-3 mb-2 min-w-0">
        <p
          className="text-base sm:text-lg font-display font-bold text-gray-800 dark:text-gray-100 tabular-nums truncate min-w-0 flex-1"
          title={`${formatCurrency(spent)} / ${formatCurrency(total)}`}
        >
          {formatCurrencyCompact(spent)}
          <span className="text-xs sm:text-sm font-normal text-gray-400"> / {formatCurrencyCompact(total)}</span>
        </p>
        <span className={`text-sm font-bold shrink-0 ${isOver ? "text-red-primary" : "text-emerald-500"}`}>
          {percent}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isOver ? "bg-red-primary" : percent > 80 ? "bg-amber-400" : "bg-pink-primary"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface WeeklyTx {
  type: string;
  date: string;
  amount: number;
  currency: string | null;
}

/** Local YYYY-MM-DD of the Sunday that started LAST week (14-day window). */
function getWeeklyWindowStart(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() - 7);
  return formatLocalDate(start);
}

// Weekly comparison card
function WeeklySummary({ transactions }: { transactions: WeeklyTx[] }) {
  const { t, formatCurrency, formatCurrencyCompact } = useI18n();
  const { thisWeek, lastWeek } = useMemo(() => {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    let thisW = 0;
    let lastW = 0;

    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const d = new Date(t.date + "T12:00:00");
      if (d >= startOfThisWeek) thisW += t.amount;
      else if (d >= startOfLastWeek) lastW += t.amount;
    }

    return { thisWeek: thisW, lastWeek: lastW };
  }, [transactions]);

  const diff = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
  const isUp = diff > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{t.dashboard.weeklySummary}</span>
      </div>
      <p
        className="text-base sm:text-lg md:text-xl font-display font-bold text-gray-800 dark:text-gray-100 mb-1 tabular-nums truncate"
        title={formatCurrency(thisWeek)}
      >
        {formatCurrencyCompact(thisWeek)}
      </p>
      <p className="text-xs text-gray-400 truncate">
        {lastWeek > 0 ? (
          <>
            <span className={isUp ? "text-red-primary font-semibold" : "text-emerald-500 font-semibold"}>
              {isUp ? "+" : ""}{diff}%
            </span>
            {" "}{t.dashboard.vsLastWeek} ({formatCurrencyCompact(lastWeek)})
          </>
        ) : (
          t.dashboard.firstWeekData
        )}
      </p>
    </div>
  );
}

export function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: couple } = useCouple();
  const { t, greeting, formatCurrency, formatCurrencyCompact, translateCategory } = useI18n();
  const month = getCurrentMonth();
  const coupleId = profile?.couple_id ?? "";
  const mode = useAppStore((s) => s.mode);

  const { data: transactions, isLoading: txLoading } = useTransactions({ coupleId, mode, month });
  const { data: budget } = useBudget({
    coupleId,
    month,
    mode,
    ownerId: mode === "personal" ? profile?.id : null,
  });

  useRealtimeTransactions(coupleId || undefined);

  const primaryCurrency = couple?.primary_currency ?? "BRL";

  // Headline totals only make sense within one currency: exclude
  // foreign-currency rows (auto-convert off) and surface them separately.
  const { primary: primaryTx, foreign } = useMemo(
    () => splitByCurrency(transactions ?? [], primaryCurrency),
    [transactions, primaryCurrency]
  );
  const foreignBreakdown = formatForeignBreakdown(foreign, formatCurrency);

  const income = primaryTx
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = primaryTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;
  const recentTransactions = (transactions ?? []).slice(0, 5);

  // Weekly card: its Sunday-to-Sunday windows straddle month boundaries, so it
  // needs its own 14-day query instead of the month-filtered list above.
  const weeklyStart = getWeeklyWindowStart();
  const { data: weeklyTx } = useQuery({
    queryKey: ["transactions", "weekly", coupleId, mode, weeklyStart],
    queryFn: async (): Promise<WeeklyTx[]> => {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, date, amount, currency")
        .eq("couple_id", coupleId)
        .eq("scope", mode)
        .gte("date", weeklyStart);
      if (error) throw error;
      return (data ?? []) as WeeklyTx[];
    },
    enabled: !!coupleId,
  });
  const weeklyPrimaryTx = useMemo(
    () => splitByCurrency(weeklyTx ?? [], primaryCurrency).primary,
    [weeklyTx, primaryCurrency]
  );

  // Category breakdown for donut chart (primary currency only — percentages
  // across mixed currencies would be meaningless)
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; color: string; value: number }>();
    for (const tx of primaryTx) {
      if (tx.type !== "expense") continue;
      const rawName = tx.category?.name ?? "Outros";
      const displayName = tx.category ? translateCategory(tx.category) : translateCategory(rawName);
      const color = tx.category?.color ?? "#AEB6BF";
      const existing = map.get(rawName);
      if (existing) {
        existing.value += tx.amount;
      } else {
        map.set(rawName, { name: displayName, color, value: tx.amount });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [primaryTx, translateCategory]);

  if (profileLoading || txLoading) return <DashboardSkeleton />;

  return (
    <div className="max-w-6xl mx-auto min-w-0">
      {/* Header — relative + z-40 so the notifications popover renders
          above the balance card below (its animate-fadeIn creates its own
          stacking context). */}
      <div className="relative z-40 flex items-center justify-between gap-3 mb-6 sm:mb-8 animate-stagger min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
            {getGreetingEmoji()} {greeting()}, {profile?.display_name ?? ""}!
          </h1>
          <p className="text-gray-400 mt-1 text-sm truncate">
            {t.dashboard.coupleSummary}
          </p>
        </div>
        <NotificationsPopover />
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-pink-primary via-pink-light to-pink-200 rounded-3xl p-6 sm:p-8 mb-6 sm:mb-8 text-white shadow-xl shadow-pink-primary/20 animate-fadeIn overflow-hidden">
        <p className="text-white/70 text-sm font-medium mb-1">
          {t.dashboard.coupleBalance}
        </p>
        <p
          className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-4 tabular-nums break-words"
          title={formatCurrency(balance)}
        >
          {formatCurrencyCompact(balance)}
        </p>
        {foreignBreakdown && (
          <p className="text-white/70 text-xs mb-3 -mt-2 break-words">
            {t.transactions.otherCurrenciesNote} {foreignBreakdown}
          </p>
        )}
        <div className="flex flex-wrap gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-sm">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-white/80 text-sm">{t.common.me}</span>
          </div>
          {mode === "couple" && couple?.partner && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-sm">
                  {couple.partner.display_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-white/80 text-sm">
                {couple.partner.display_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Advisor CTA */}
      <Link
        to="/advisor"
        className="group relative block mb-6 sm:mb-8 rounded-2xl overflow-hidden border border-indigo-100 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-4 p-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
              {t.advisor.cardCtaTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {t.advisor.cardCtaBody}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
            <span className="hidden sm:inline">{t.advisor.cardCtaButton}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>

      {/* Income / Expenses / Weekly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 sm:mb-8 animate-stagger">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
              {t.dashboard.income}
            </span>
          </div>
          <p
            className="text-xl sm:text-2xl font-display font-bold text-emerald-500 tabular-nums truncate"
            title={formatCurrency(income)}
          >
            {formatCurrencyCompact(income)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-red-primary" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
              {t.dashboard.expenses}
            </span>
          </div>
          <p
            className="text-xl sm:text-2xl font-display font-bold text-red-primary tabular-nums truncate"
            title={formatCurrency(expenses)}
          >
            {formatCurrencyCompact(expenses)}
          </p>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <WeeklySummary transactions={weeklyPrimaryTx} />
        </div>
      </div>

      {/* Budget Progress + Category Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {budget ? (
          <BudgetProgress
            spent={expenses}
            total={budget.total_amount}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.nav.budget}</p>
              <p className="text-xs text-gray-400">{t.dashboard.noBudget}</p>
            </div>
            <Link
              to="/budget"
              className="text-sm text-pink-primary font-semibold hover:underline"
            >
              {t.dashboard.create}
            </Link>
          </div>
        )}

        {categoryData.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 card-hover">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-4">{t.dashboard.spendingByCategory}</p>
            <DonutChart data={categoryData} />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 flex items-center justify-center">
            <p className="text-xs text-gray-400">{t.dashboard.noExpensesMonth}</p>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100">
            {t.dashboard.recentTransactions}
          </h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-sm text-pink-primary font-medium hover:underline"
          >
            {t.dashboard.seeAll}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState
            variant="money"
            title={t.dashboard.noTransactionsMonth}
            description={t.dashboard.startAddingFirst}
            action={
              <Link
                to="/transactions/new"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl transition-all"
              >
                {t.dashboard.addTransaction}
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {recentTransactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ transaction: tx }: { transaction: TransactionWithCategory }) {
  const { formatCurrency, formatCurrencyCompact, formatDate, translateCategory } = useI18n();
  const isExpense = tx.type === "expense";
  const categoryLabel = translateCategory(tx.category);

  return (
    <Link
      to={`/transactions/${tx.id}/edit`}
      className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer min-w-0"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${tx.category?.color ?? "#AEB6BF"}15` }}
      >
        <span
          className="text-sm font-bold"
          style={{ color: tx.category?.color ?? "#AEB6BF" }}
        >
          {categoryLabel.charAt(0) || "?"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {tx.description}
          </p>
          {tx.notes && tx.notes.trim() !== "" && (
            <span
              className="shrink-0 text-pink-primary"
              title={tx.notes}
              aria-label={tx.notes}
            >
              <StickyNote className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">
          {categoryLabel} · {formatDate(tx.date)}
        </p>
      </div>
      <div className="flex flex-col items-end shrink-0">
        <p
          className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
            isExpense ? "text-red-primary" : "text-emerald-500"
          }`}
          title={formatCurrency(tx.amount, tx.currency)}
        >
          {isExpense ? "- " : "+ "}
          {formatCurrencyCompact(tx.amount, tx.currency)}
        </p>
        {tx.original_currency &&
          tx.original_currency !== tx.currency &&
          tx.original_amount != null && (
            <p className="text-[10px] text-gray-400 tabular-nums whitespace-nowrap">
              {formatCurrency(tx.original_amount, tx.original_currency)}
            </p>
          )}
      </div>
    </Link>
  );
}
