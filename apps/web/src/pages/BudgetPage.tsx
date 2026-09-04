import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useProfile,
  useBudget,
  useCreateBudget,
  useCategories,
  useI18n,
  useAppStore,
  useRealtimeTransactions,
} from "@paca/api";
import { supabase } from "@paca/api";
import {
  getCurrentMonth,
  parseMoneyInput,
  centsToInput,
  BUDGET_THRESHOLDS,
  type BudgetWithCategories,
} from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ChevronLeft,
  ChevronRight,
  PieChart,
  Plus,
  Settings,
} from "lucide-react";

export function BudgetPage() {
  const { data: profile } = useProfile();
  const { t, formatMonthYear } = useI18n();
  const coupleId = profile?.couple_id ?? "";
  const mode = useAppStore((s) => s.mode);
  const ownerId = mode === "personal" ? profile?.id ?? null : null;
  const [month, setMonth] = useState(getCurrentMonth());
  const [showSetup, setShowSetup] = useState(false);

  // Sem isto a tela de Orçamento era a única que NÃO recebia o gasto que a
  // outra pessoa acabou de lançar: o Dashboard e as Transações assinavam, ela
  // não. Quem estivesse com o Orçamento aberto via o número velho até recarregar
  // — justamente na tela onde os dois combinam quanto ainda dá para gastar.
  // O hook já invalida a chave "budget"; faltava só chamá-lo aqui.
  useRealtimeTransactions(coupleId || undefined);

  const { data: budget, isLoading } = useBudget({ coupleId, month, mode, ownerId });

  const prevMonth = () => {
    setShowSetup(false);
    const d = new Date(month + "T00:00:00");
    d.setMonth(d.getMonth() - 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };
  const nextMonth = () => {
    setShowSetup(false);
    const d = new Date(month + "T00:00:00");
    d.setMonth(d.getMonth() + 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto page-enter min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
          {t.budget.title}
        </h1>
        {budget && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSetup(true)}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{t.budget.editBudget}</span>
          </Button>
        )}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <button onClick={prevMonth} aria-label={t.format.previousMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize truncate">
          {formatMonthYear(month)}
        </span>
        <button onClick={nextMonth} aria-label={t.format.nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {!budget && !showSetup ? (
        <NoBudget onSetup={() => setShowSetup(true)} />
      ) : showSetup ? (
        <BudgetSetup
          coupleId={coupleId}
          month={month}
          mode={mode}
          ownerId={ownerId}
          existingBudget={budget ?? null}
          onDone={() => setShowSetup(false)}
        />
      ) : (
        <BudgetOverview budget={budget!} />
      )}
    </div>
  );
}

function NoBudget({ onSetup }: { onSetup: () => void }) {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pink-50 dark:bg-pink-primary/10 flex items-center justify-center">
        <PieChart className="w-8 h-8 text-pink-primary" />
      </div>
      <h3 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
        {t.budget.noBudget}
      </h3>
      <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
        {t.budget.noBudgetDesc}
      </p>
      <Button onClick={onSetup}>
        <Plus className="w-4 h-4" />
        {t.budget.createBudget}
      </Button>
    </div>
  );
}

function BudgetOverview({ budget }: { budget: BudgetWithCategories }) {
  const { t, formatCurrency, formatCurrencyCompact, translateCategory } = useI18n();
  const totalSpent = budget.categories.reduce((sum, c) => sum + c.spent, 0);
  const totalRatio = budget.total_amount > 0 ? totalSpent / budget.total_amount : 0;
  const totalPercent = Math.round(totalRatio * 100);

  const getBarColor = (ratio: number) => {
    if (ratio >= BUDGET_THRESHOLDS.exceeded) return "bg-red-primary";
    if (ratio >= BUDGET_THRESHOLDS.normal) return "bg-amber-400";
    return "bg-pink-primary";
  };

  return (
    <div className="space-y-6 min-w-0">
      {/* Total budget card */}
      <div className="bg-gradient-to-br from-pink-primary via-pink-light to-pink-200 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-pink-primary/20 overflow-hidden">
        <p className="text-white/70 text-sm mb-1">{t.budget.totalBudget}</p>
        <p
          className="text-2xl sm:text-3xl font-display font-bold mb-1 tabular-nums break-words"
          title={formatCurrency(budget.total_amount)}
        >
          {formatCurrencyCompact(budget.total_amount)}
        </p>
        <p className="text-white/70 text-sm mb-4 truncate" title={`${formatCurrency(totalSpent)} ${t.budget.spent}`}>
          {formatCurrencyCompact(totalSpent)} {t.budget.spent} · {totalPercent}%
        </p>
        <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${Math.min(totalPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Categories grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budget.categories.map((bc) => {
          const hasAllocation = bc.allocated_amount > 0;
          const hasSpending = bc.spent > 0;
          const ratio = hasAllocation ? bc.spent / bc.allocated_amount : hasSpending ? 1.5 : 0;
          const percent = hasAllocation ? Math.round(ratio * 100) : hasSpending ? null : 0;

          return (
            <div
              key={bc.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 min-w-0"
            >
              <div className="flex items-center justify-between gap-3 mb-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${bc.category?.color ?? "#AEB6BF"}15` }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{ color: bc.category?.color ?? "#AEB6BF" }}
                    >
                      {translateCategory(bc.category).charAt(0) || "?"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                      {translateCategory(bc.category)}
                    </p>
                    <p
                      className="text-xs text-gray-400 tabular-nums truncate"
                      title={`${formatCurrency(bc.spent)} / ${formatCurrency(bc.allocated_amount)}`}
                    >
                      {formatCurrencyCompact(bc.spent)} / {formatCurrencyCompact(bc.allocated_amount)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold shrink-0 ${
                    ratio >= BUDGET_THRESHOLDS.exceeded
                      ? "text-red-primary"
                      : ratio >= BUDGET_THRESHOLDS.normal
                        ? "text-amber-500"
                        : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {percent != null ? `${percent}%` : "—"}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getBarColor(ratio)}`}
                  style={{ width: `${Math.min(percent ?? 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BudgetSetup({
  coupleId,
  month,
  mode,
  ownerId,
  existingBudget,
  onDone,
}: {
  coupleId: string;
  month: string;
  mode: "couple" | "personal";
  ownerId: string | null;
  existingBudget: BudgetWithCategories | null;
  onDone: () => void;
}) {
  const { t, translateCategory } = useI18n();
  const createBudget = useCreateBudget();
  const [totalAmount, setTotalAmount] = useState(
    existingBudget ? centsToInput(existingBudget.total_amount) : ""
  );
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories(mode);
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#FF8FB1");
  const [savingCat, setSavingCat] = useState(false);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  const PRESET_COLORS = [
    "#FF8FB1", "#FF6B6B", "#FBBF24", "#34D399",
    "#60A5FA", "#A78BFA", "#F472B6", "#6EE7B7",
  ];

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    const { data, error: catError } = await supabase
      .from("categories")
      .insert({
        couple_id: coupleId,
        scope: mode,
        owner_id: mode === "personal" ? ownerId : null,
        name: newCatName.trim(),
        icon: newCatName.trim().charAt(0).toUpperCase(),
        color: newCatColor,
        is_default: false,
      })
      .select()
      .single();
    setSavingCat(false);
    if (!catError && data) {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCatName("");
      setShowNewCategory(false);
    }
  };

  useEffect(() => {
    if (showNewCategory && newCatInputRef.current) {
      newCatInputRef.current.focus();
    }
  }, [showNewCategory]);

  // Pre-fill allocations from the existing budget
  useEffect(() => {
    if (!existingBudget) return;
    const allocs: Record<string, string> = {};
    for (const bc of existingBudget.categories) {
      allocs[bc.category_id] = centsToInput(bc.allocated_amount);
    }
    setAllocations(allocs);
  }, [existingBudget]);

  const handleSave = async () => {
    setError("");

    const totalCents = parseMoneyInput(totalAmount);
    if (totalCents == null) {
      setError(t.budget.invalidTotal);
      return;
    }

    const cats = Object.entries(allocations)
      .map(([categoryId, val]) => ({
        category_id: categoryId,
        allocated_amount: parseMoneyInput(val) ?? 0,
      }))
      .filter((c) => c.allocated_amount > 0);

    try {
      await createBudget.mutateAsync({
        budget: {
          couple_id: coupleId,
          scope: mode,
          owner_id: mode === "personal" ? ownerId : null,
          month,
          total_amount: totalCents,
        },
        categories: cats,
      });
      onDone();
    } catch {
      setError(t.budget.saveError);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      <h3 className="text-lg font-display font-bold text-gray-800 dark:text-gray-100 mb-6">
        {t.budget.setupBudget}
      </h3>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-primary/10 text-red-primary text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <Input
          label={t.budget.totalMonth}
          type="text"
          inputMode="decimal"
          placeholder="3000,00"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />
      </div>

      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {t.budget.limitPerCategory}
      </p>
      <div className="space-y-3 mb-4">
        {categories.map((cat) => {
          const catLabel = translateCategory(cat);
          return (
          <div key={cat.id} className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${cat.color}20` }}
            >
              <span className="text-xs font-bold" style={{ color: cat.color }}>
                {catLabel.charAt(0)}
              </span>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-32 truncate">
              {catLabel}
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={allocations[cat.id] ?? ""}
              onChange={(e) =>
                setAllocations((prev) => ({
                  ...prev,
                  [cat.id]: e.target.value,
                }))
              }
              className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 text-right focus:outline-none focus:ring-2 focus:ring-pink-primary/50 transition-all"
            />
          </div>
          );
        })}
      </div>

      {/* New category */}
      {showNewCategory ? (
        <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-pink-primary/30 bg-pink-50/50 dark:bg-pink-primary/5 space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg shrink-0"
              style={{ backgroundColor: newCatColor }}
            />
            <input
              ref={newCatInputRef}
              type="text"
              placeholder={t.budget.categoryName}
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
              className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`${t.categoryManager.color} ${color}`}
                onClick={() => setNewCatColor(color)}
                className={`w-7 h-7 rounded-full transition-all ${
                  newCatColor === color
                    ? "ring-2 ring-offset-2 ring-pink-primary dark:ring-offset-gray-800 scale-110"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowNewCategory(false); setNewCatName(""); }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCatName.trim() || savingCat}
              className="px-4 py-2 text-sm font-semibold text-pink-primary hover:bg-pink-50 dark:hover:bg-pink-primary/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {savingCat ? t.common.saving : t.common.add}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewCategory(true)}
          className="mb-6 flex items-center gap-2 text-sm text-pink-primary font-medium hover:bg-pink-50 dark:hover:bg-pink-primary/10 px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.budget.newCategory}
        </button>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button fullWidth loading={createBudget.isPending} onClick={handleSave}>
          {t.budget.saveBudget}
        </Button>
      </div>
    </div>
  );
}
