import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUpdateTransaction, useCategories, useI18n } from "@paca/api";
import { supabase } from "@paca/api";
import {
  transactionUpdateSchema,
  parseMoneyInput,
  centsToInput,
  type FinanceScope,
  type TransactionType,
} from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { localizeZodError } from "@/lib/zodError";
import { ArrowLeft } from "lucide-react";

export function EditTransactionPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const updateTransaction = useUpdateTransaction();
  const { toast } = useToast();
  const { t, translateCategory } = useI18n();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyCode] = useState<string>("");
  const [originalAmount, setOriginalAmount] = useState<number | null>(null);
  const [originalCurrency, setOriginalCurrency] = useState<string | null>(null);
  const [txScope, setTxScope] = useState<FinanceScope | null>(null);

  // Categories for the transaction's scope (shared hook filters hidden defaults)
  const { data: categories = [] } = useCategories(txScope ?? "couple");

  // Fetch existing transaction
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return;
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError(t.transactions.notFound);
        setLoading(false);
        return;
      }

      setType(data.type);
      setTxScope((data.scope as FinanceScope) ?? "couple");
      setAmount(centsToInput(data.amount));
      setDescription(data.description);
      setCategoryId(data.category_id);
      setDate(data.date);
      setNotes(data.notes ?? "");
      setCurrencyCode(data.currency ?? "");
      setOriginalAmount(data.original_amount ?? null);
      setOriginalCurrency(data.original_currency ?? null);
      setLoading(false);
    };
    fetchTransaction();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!id) return;

    const amountCents = parseMoneyInput(amount);
    if (amountCents == null) {
      setError(t.transactions.invalidAmount);
      return;
    }

    // If transaction was auto-converted and user changed the converted amount,
    // recompute exchange_rate to keep original_amount * rate ≈ amount.
    const wasConverted =
      originalAmount != null &&
      originalCurrency != null &&
      originalCurrency !== currency;
    const recomputedRate =
      wasConverted && originalAmount && originalAmount > 0
        ? amountCents / originalAmount
        : undefined;

    const result = transactionUpdateSchema.safeParse({
      type,
      amount: amountCents,
      description,
      category_id: categoryId,
      date,
      notes: notes || null,
      ...(recomputedRate !== undefined ? { exchange_rate: recomputedRate } : {}),
    });

    if (!result.success) {
      setError(localizeZodError(result.error.errors[0], t.validation));
      return;
    }

    try {
      await updateTransaction.mutateAsync({ id, updates: result.data });
      toast(t.transactions.transactionUpdated);
      navigate("/transactions");
    } catch {
      setError(t.transactions.updateError);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
      </div>
    );
  }

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
          {t.transactions.editTransaction}
        </h1>
      </div>

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
            onClick={() => setType("expense")}
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
            onClick={() => setType("income")}
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
            {currency ? ` (${currency})` : ""}
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 sm:px-4 py-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-2xl sm:text-3xl font-display font-bold text-center tabular-nums text-gray-800 dark:text-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-primary/50 focus:border-pink-primary transition-all"
          />
          {originalAmount != null &&
            originalCurrency &&
            originalCurrency !== currency && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t.transactions.originalAmountLabel}:{" "}
                <span className="font-semibold tabular-nums">
                  {(originalAmount / 100).toFixed(2).replace(".", ",")} {originalCurrency}
                </span>
              </p>
            )}
        </div>

        {/* Description */}
        <Input
          label={t.transactions.description}
          placeholder={t.transactions.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {/* Category */}
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
          loading={updateTransaction.isPending}
        >
          {t.transactions.saveChanges}
        </Button>
      </form>
    </div>
  );
}
