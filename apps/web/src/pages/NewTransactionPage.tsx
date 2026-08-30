import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile, useCouple, useAddTransaction, useI18n, useAppStore } from "@paca/api";
import { supabase } from "@paca/api";
import {
  transactionInsertSchema,
  DEFAULT_CATEGORIES,
  parseMoneyInput,
  getTodayLocal,
  type TransactionType,
  type Category,
} from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { localizeZodError } from "@/lib/zodError";
import { ArrowLeft, ScanLine, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";

export function NewTransactionPage() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple();
  const mode = useAppStore((s) => s.mode);
  const addTransaction = useAddTransaction();
  const { toast } = useToast();
  const { t, translateCategory } = useI18n();

  const [type, setType] = useState<TransactionType>("expense");
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === "income") {
      const outros = categories.find((c) => c.name === "Outros");
      if (outros) setCategoryId(outros.id);
      else if (categories.length > 0) setCategoryId(categories[0].id);
    }
  };
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(getTodayLocal());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      let query = supabase.from("categories").select("*").order("name");
      if (mode === "couple") {
        query = query.or(
          `is_default.eq.true,and(scope.eq.couple,couple_id.eq.${profile?.couple_id})`
        );
      } else if (profile?.id) {
        query = query.or(
          `is_default.eq.true,and(scope.eq.personal,owner_id.eq.${profile.id})`
        );
      } else {
        query = query.eq("is_default", true);
      }
      const { data } = await query;
      if (data) {
        setCategories(data);
        if (data.length > 0 && !categoryId) setCategoryId(data[0].id);
      }
    };
    if (profile?.couple_id) fetchCategories();
  }, [profile?.couple_id, profile?.id, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amountCents = parseMoneyInput(amount);
    if (amountCents == null) {
      setError(t.transactions.invalidAmount);
      return;
    }

    const result = transactionInsertSchema.safeParse({
      type,
      amount: amountCents,
      description,
      category_id: categoryId,
      date,
      notes: notes || null,
    });

    if (!result.success) {
      setError(localizeZodError(result.error.errors[0], t.validation));
      return;
    }

    try {
      await addTransaction.mutateAsync({
        ...result.data,
        couple_id: profile!.couple_id!,
        paid_by: profile!.id,
        scope: mode,
        currency: couple?.primary_currency ?? "BRL",
      });
      toast(t.transactions.transactionAdded);
      navigate("/transactions");
    } catch {
      setError(t.transactions.saveError);
    }
  };

  return (
    <div className="max-w-2xl mx-auto page-enter min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 min-w-0">
        <button
          onClick={() => navigate(-1)}
          aria-label={t.common.back}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100 flex-1 truncate">
          {t.transactions.newTransaction}
        </h1>
        <Link
          to="/scan"
          className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-pink-50 dark:bg-pink-primary/10 text-pink-primary text-sm font-semibold hover:bg-pink-100 dark:hover:bg-pink-primary/20 transition-colors shrink-0"
        >
          <ScanLine className="w-4 h-4" />
          <span className="hidden sm:inline">{t.transactions.scan}</span>
        </Link>
      </div>

      {/* Advisor shortcut */}
      <Link
        to="/advisor"
        className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors w-fit"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        {t.advisor.linkShortcut}
      </Link>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 border border-red-200 dark:border-red-primary/20 text-red-primary text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => handleTypeChange("expense")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
              type === "expense"
                ? "bg-red-primary text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.transactions.expense}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("income")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
              type === "income"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.transactions.income}
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.transactions.amountCurrency}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 sm:px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-2xl sm:text-3xl font-display font-bold text-center tabular-nums text-gray-800 dark:text-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all"
          />
        </div>

        {/* Description */}
        <Input
          label={t.transactions.description}
          placeholder={t.transactions.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Category (only for expenses) */}
        {type === "expense" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t.transactions.category}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const catLabel = translateCategory(cat);
                return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    categoryId === cat.id
                      ? "border-pink-primary bg-pink-50 dark:bg-pink-primary/10 text-pink-primary"
                      : "border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600"
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: `${cat.color}20`,
                      color: cat.color,
                    }}
                  >
                    {catLabel.charAt(0)}
                  </span>
                  <span className="truncate">{catLabel}</span>
                </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Who paid */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t.transactions.whoPaid}
          </label>
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-pink-primary bg-pink-50 dark:bg-pink-primary/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-primary to-pink-light flex items-center justify-center text-white text-sm font-bold shrink-0">
                {profile?.display_name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-pink-primary truncate">{t.common.me}</span>
            </div>
            {couple?.partner && (
              <div className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-gray-500 opacity-50 cursor-not-allowed">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-sm font-bold shrink-0">
                  {couple.partner.display_name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate">
                  {couple.partner.display_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <Input
          label={t.transactions.date}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t.transactions.notes}
          </label>
          <textarea
            placeholder={t.transactions.notesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all resize-none"
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={addTransaction.isPending}
        >
          {t.transactions.addTransaction}
        </Button>
      </form>
    </div>
  );
}
