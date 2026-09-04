import { useState, useMemo, useEffect } from "react";
import { useProfile, useCouple, useTransactions, useDeleteTransaction, useRealtimeTransactions, useI18n, useCategories, useAppStore } from "@paca/api";
import {
  getCurrentMonth,
  DEFAULT_CATEGORIES,
  type TransactionWithCategory,
} from "@paca/shared";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Pencil,
  FileDown,
  StickyNote,
  Tag,
  X,
} from "lucide-react";
import { TransactionsSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { exportMonthlyReport } from "@/utils/exportPdf";
import { splitByCurrency, formatForeignBreakdown } from "@/utils/currencyBreakdown";

type TypeFilter = "all" | "income" | "expense";
type PaidByFilter = "all" | "me" | "partner";

interface PersistedFilters {
  month?: string;
  typeFilter?: TypeFilter;
  paidByFilter?: PaidByFilter;
  searchQuery?: string;
  categoryId?: string;
}

const FILTERS_STORAGE_KEY = "paca_transactions_filters";

function loadFilters(): PersistedFilters {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedFilters) : {};
  } catch {
    return {};
  }
}

export function TransactionsPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: couple } = useCouple();
  const mode = useAppStore((s) => s.mode);
  const { data: categories = [] } = useCategories(mode);
  const { t, locale, dateLocale, formatCurrency, formatCurrencyCompact, formatDate, formatMonthYear, translateCategory } = useI18n();
  const coupleId = profile?.couple_id ?? "";
  const primaryCurrency = couple?.primary_currency ?? "BRL";

  const saved = useMemo(loadFilters, []);
  const [month, setMonth] = useState(saved.month ?? getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(saved.typeFilter ?? "all");
  const [paidByFilter, setPaidByFilter] = useState<PaidByFilter>(saved.paidByFilter ?? "all");
  const [searchQuery, setSearchQuery] = useState(saved.searchQuery ?? "");
  const [categoryId, setCategoryId] = useState<string>(saved.categoryId ?? "");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ month, typeFilter, paidByFilter, searchQuery, categoryId })
      );
    } catch {
      // ignore quota errors
    }
  }, [month, typeFilter, paidByFilter, searchQuery, categoryId]);
  const deleteTransaction = useDeleteTransaction();
  const { toast } = useToast();

  const { data: transactions, isLoading } = useTransactions({
    coupleId,
    mode,
    month,
    type: typeFilter === "all" ? undefined : typeFilter,
    categoryId: categoryId || undefined,
  });

  useRealtimeTransactions(coupleId || undefined);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    let result = transactions;

    // Filter by who paid
    if (paidByFilter === "me" && profile) {
      result = result.filter((t) => t.paid_by === profile.id);
    } else if (paidByFilter === "partner" && profile) {
      result = result.filter((t) => t.paid_by !== profile.id);
    }

    // Filter by search (match both raw and translated category names)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          tx.category?.name?.toLowerCase().includes(q) ||
          translateCategory(tx.category).toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, searchQuery, paidByFilter, profile, translateCategory]);

  // Month navigation
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

  // Headline totals only make sense within one currency: exclude
  // foreign-currency rows (auto-convert off) and surface them separately.
  const { primary: primaryTx, foreign } = useMemo(
    () => splitByCurrency(filtered, primaryCurrency),
    [filtered, primaryCurrency]
  );
  const foreignBreakdown = formatForeignBreakdown(foreign, formatCurrency);

  const income = primaryTx
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = primaryTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleDelete = async (id: string) => {
    if (!confirm(t.transactions.deleteConfirm)) return;
    try {
      await deleteTransaction.mutateAsync(id);
      toast(t.transactions.deleted);
    } catch {
      toast(t.common.errorBoundaryMessage, "error");
    }
  };

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, TransactionWithCategory[]> = {};
    for (const t of filtered) {
      const key = t.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  if (profileLoading) return <TransactionsSkeleton />;

  return (
    <div className="max-w-6xl mx-auto page-enter min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
          {t.transactions.title}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {(transactions?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await exportMonthlyReport(
                    transactions!,
                    month,
                    profile?.display_name ?? "Paca",
                    {
                      t,
                      locale,
                      dateLocale,
                      formatCurrency,
                      formatDate,
                      formatMonthYear,
                      translateCategory,
                      primaryCurrency,
                    }
                  );
                  toast(t.transactions.pdfExported);
                } catch {
                  toast(t.common.errorBoundaryMessage, "error");
                }
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">{t.transactions.exportPdf}</span>
            </button>
          )}
          <Link
            to="/transactions/new"
            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-primary to-pink-light text-white font-semibold text-sm shadow-lg shadow-pink-primary/25 hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.transactions.newTransaction}</span>
          </Link>
        </div>
      </div>

      {/* Month selector + Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Month nav */}
        <div className="col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
          <button
            onClick={prevMonth}
            aria-label={t.format.previousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize truncate">
            {formatMonthYear(month)}
          </span>
          <button
            onClick={nextMonth}
            aria-label={t.format.nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Income summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
          <p className="text-xs text-gray-400 mb-1 truncate">{t.transactions.incomes}</p>
          <p
            className="text-base sm:text-lg font-bold text-emerald-500 tabular-nums truncate"
            title={formatCurrency(income)}
          >
            {formatCurrencyCompact(income)}
          </p>
        </div>

        {/* Expenses summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 card-hover min-w-0">
          <p className="text-xs text-gray-400 mb-1 truncate">{t.transactions.expenses}</p>
          <p
            className="text-base sm:text-lg font-bold text-red-primary tabular-nums truncate"
            title={formatCurrency(expenses)}
          >
            {formatCurrencyCompact(expenses)}
          </p>
        </div>

        {/* Balance */}
        <div className={`col-span-2 lg:col-span-1 rounded-2xl p-3 sm:p-4 border card-hover min-w-0 ${
          income - expenses >= 0
            ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
            : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20"
        }`}>
          <p className="text-xs text-gray-400 mb-1 truncate">{t.transactions.balance}</p>
          <p
            className={`text-base sm:text-lg font-bold tabular-nums truncate ${
              income - expenses >= 0 ? "text-emerald-500" : "text-red-primary"
            }`}
            title={formatCurrency(income - expenses)}
          >
            {formatCurrencyCompact(income - expenses)}
          </p>
        </div>
      </div>

      {/* Foreign-currency amounts excluded from the totals above */}
      {foreignBreakdown && (
        <p className="text-xs text-gray-400 -mt-4 mb-6 px-1 break-words">
          {t.transactions.otherCurrenciesNote} {foreignBreakdown}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        {/* Search — full width on mobile so the pills below get their own row */}
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.transactions.searchTransaction}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all"
          />
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(["all", "expense", "income"] as TypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                typeFilter === type
                  ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {type === "all" ? t.transactions.allTypes : type === "income" ? t.transactions.incomes : t.transactions.expenses}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setCategoryMenuOpen((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              categoryId
                ? "bg-white dark:bg-gray-800 border-pink-primary/40 text-gray-800 dark:text-gray-100"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            aria-haspopup="listbox"
            aria-expanded={categoryMenuOpen}
          >
            <Tag className={`w-4 h-4 ${categoryId ? "text-pink-primary" : ""}`} />
            <span className="truncate max-w-[140px]">
              {categoryId
                ? translateCategory(categories.find((c) => c.id === categoryId))
                : t.transactions.allCategories}
            </span>
            {categoryId ? (
              <button
                type="button"
                aria-label={t.common.cancel ?? "Clear"}
                onClick={(e) => {
                  e.stopPropagation();
                  setCategoryId("");
                  setCategoryMenuOpen(false);
                }}
                className="p-0.5 -mr-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {categoryMenuOpen && (
            <>
              <button
                type="button"
                aria-label={t.common.close}
                onClick={() => setCategoryMenuOpen(false)}
                className="fixed inset-0 z-10 bg-transparent cursor-default"
              />
              <div
                role="listbox"
                className="absolute z-20 mt-2 left-0 sm:left-auto sm:right-0 w-64 max-w-[calc(100vw-1.5rem)] max-h-72 overflow-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xl py-1"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={!categoryId}
                  onClick={() => {
                    setCategoryId("");
                    setCategoryMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    !categoryId
                      ? "bg-pink-50 dark:bg-pink-primary/10 text-pink-primary font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t.transactions.allCategories}
                </button>
                {categories.map((cat) => {
                  const selected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setCategoryId(cat.id);
                        setCategoryMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        selected
                          ? "bg-pink-50 dark:bg-pink-primary/10 text-pink-primary font-semibold"
                          : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                        }}
                      >
                        {translateCategory(cat).charAt(0).toUpperCase() || "?"}
                      </span>
                      <span className="truncate">{translateCategory(cat)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Paid by filter — couple mode only (personal txns are always mine) */}
        {mode === "couple" && couple?.partner && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(["all", "me", "partner"] as PaidByFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setPaidByFilter(filter)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  paidByFilter === filter
                    ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {filter === "all" ? t.common.everyone : filter === "me" ? t.common.me : couple.partner!.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 mx-auto rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            variant={searchQuery ? "search" : "money"}
            title={searchQuery ? t.transactions.noResults : t.transactions.noTransactionsPeriod}
            description={searchQuery ? t.transactions.tryOtherSearch : t.transactions.addFirstMonth}
          />
        ) : (
          grouped.map(([date, items]) => (
            <div key={date}>
              <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {formatDate(date)}
                </span>
              </div>
              {items.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors group min-w-0"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${tx.category?.color ?? "#AEB6BF"}15`,
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: tx.category?.color ?? "#AEB6BF" }}
                    >
                      {translateCategory(tx.category).charAt(0) || "?"}
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
                      {translateCategory(tx.category)} ·{" "}
                      {tx.paid_by_profile?.display_name ?? ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <p
                      className={`text-sm font-semibold whitespace-nowrap tabular-nums ${
                        tx.type === "expense"
                          ? "text-red-primary"
                          : "text-emerald-500"
                      }`}
                      title={formatCurrency(tx.amount, tx.currency)}
                    >
                      {tx.type === "expense" ? "- " : "+ "}
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

                  {/* Actions (always visible on mobile, hover on desktop) */}
                  <div className="flex gap-1 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/transactions/${tx.id}/edit`}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={t.transactions.editTransaction}
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-primary transition-colors"
                      aria-label={t.common.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
