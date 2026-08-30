import { useState, useMemo } from "react";
import { useProfile, useBills, useCreateBill, useToggleBill, useDeleteBill, useI18n } from "@paca/api";
import {
  getCurrentMonth,
  parseMoneyInput,
  type BillWithPayment,
} from "@paca/shared";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Receipt,
} from "lucide-react";

export function BillsPage() {
  const { data: profile } = useProfile();
  const { t, formatCurrency, formatMonthYear } = useI18n();
  const coupleId = profile?.couple_id ?? "";
  const { toast } = useToast();

  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);

  const { data: bills, isLoading } = useBills({ coupleId, month });
  const toggleBill = useToggleBill();
  const deleteBill = useDeleteBill();

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

  const handleToggle = async (bill: BillWithPayment) => {
    if (!profile) return;
    const newPaid = !bill.payment?.paid;
    try {
      await toggleBill.mutateAsync({
        billId: bill.id,
        month,
        paid: newPaid,
        profileId: profile.id,
      });
      toast(newPaid ? `${bill.name} ${t.bills.paid}` : `${bill.name} ${t.bills.unmarked}`);
    } catch {
      toast(t.common.errorBoundaryMessage, "error");
    }
  };

  const handleDelete = async (bill: BillWithPayment) => {
    if (!confirm(t.bills.deleteConfirm)) return;
    try {
      await deleteBill.mutateAsync(bill.id);
      toast(t.bills.removed);
    } catch {
      toast(t.common.errorBoundaryMessage, "error");
    }
  };

  // Summary
  const { totalAmount, paidAmount, paidCount, totalCount } = useMemo(() => {
    if (!bills) return { totalAmount: 0, paidAmount: 0, paidCount: 0, totalCount: 0 };
    let total = 0;
    let paid = 0;
    let paidC = 0;
    for (const b of bills) {
      total += b.amount;
      if (b.payment?.paid) {
        paid += b.amount;
        paidC++;
      }
    }
    return { totalAmount: total, paidAmount: paid, paidCount: paidC, totalCount: bills.length };
  }, [bills]);

  const pendingAmount = totalAmount - paidAmount;

  return (
    <div className="max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-8 min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 truncate">
            {t.bills.title}
          </h1>
          <p className="text-gray-400 text-sm mt-1 truncate">
            {t.bills.subtitle}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t.bills.newBill}</span>
        </Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 mb-6">
        <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={t.format.previousMonth}>
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
          {formatMonthYear(month)}
        </span>
        <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label={t.format.nextMonth}>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Summary cards */}
      {(bills?.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 mb-1">{t.bills.totalMonth}</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-500/20">
            <p className="text-xs text-gray-400 mb-1">{t.bills.paidCount} ({paidCount}/{totalCount})</p>
            <p className="text-lg font-bold text-emerald-500">
              {formatCurrency(paidAmount)}
            </p>
          </div>
          <div className={`rounded-2xl p-4 border ${
            pendingAmount > 0
              ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
          }`}>
            <p className="text-xs text-gray-400 mb-1">{t.bills.pending}</p>
            <p className={`text-lg font-bold ${pendingAmount > 0 ? "text-amber-500" : "text-emerald-500"}`}>
              {formatCurrency(pendingAmount)}
            </p>
          </div>
        </div>
      )}

      {/* New bill form */}
      {showForm && (
        <NewBillForm
          coupleId={coupleId}
          onDone={() => setShowForm(false)}
          onSuccess={(name) => {
            toast(`"${name}" ${t.bills.added}`);
            setShowForm(false);
          }}
        />
      )}

      {/* Bills list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-pink-primary/30 border-t-pink-primary animate-spin" />
        </div>
      ) : !bills || bills.length === 0 ? (
        <EmptyState
          variant="money"
          title={t.bills.noBills}
          description={t.bills.noBillsDesc}
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              {t.bills.addBill}
            </Button>
          }
        />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700/50">
          {bills.map((bill) => (
            <BillRow
              key={bill.id}
              bill={bill}
              onToggle={() => handleToggle(bill)}
              onDelete={() => handleDelete(bill)}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {(bills?.length ?? 0) > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">{t.bills.monthProgress}</span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-primary to-emerald-400 transition-all duration-700"
              style={{ width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BillRow({
  bill,
  onToggle,
  onDelete,
}: {
  bill: BillWithPayment;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t, formatCurrency } = useI18n();
  const isPaid = bill.payment?.paid ?? false;

  return (
    <div className={`flex items-center gap-4 px-5 py-4 group transition-colors ${
      isPaid ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""
    }`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
          isPaid
            ? "bg-emerald-500 border-emerald-500 text-white scale-100"
            : "border-gray-300 dark:border-gray-600 hover:border-pink-primary"
        }`}
        aria-label={isPaid ? t.bills.unmarkAsPaid : t.bills.markAsPaid}
      >
        {isPaid && <Check className="w-4 h-4" strokeWidth={3} />}
      </button>

      {/* Bill info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium transition-colors ${
          isPaid
            ? "text-gray-400 line-through"
            : "text-gray-800 dark:text-gray-100"
        }`}>
          {bill.name}
        </p>
        <p className="text-xs text-gray-400">
          {t.bills.dueDay} {bill.due_day}
          {bill.is_fixed && ` · ${t.bills.fixed}`}
        </p>
      </div>

      {/* Amount */}
      <p className={`text-sm font-semibold whitespace-nowrap shrink-0 ${
        isPaid ? "text-emerald-500" : "text-gray-700 dark:text-gray-300"
      }`}>
        {formatCurrency(bill.amount)}
      </p>

      {/* Delete — always visible on touch, hover-revealed on desktop */}
      <button
        type="button"
        onClick={onDelete}
        className="p-2 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-primary transition-all shrink-0"
        aria-label={t.bills.deleteBillLabel}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function NewBillForm({
  coupleId,
  onDone,
  onSuccess,
}: {
  coupleId: string;
  onDone: () => void;
  onSuccess: (name: string) => void;
}) {
  const { t } = useI18n();
  const createBill = useCreateBill();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError(t.bills.nameRequired); return; }

    const amountCents = parseMoneyInput(amount);
    if (amountCents == null) {
      setError(t.bills.invalidAmount);
      return;
    }

    const day = parseInt(dueDay);
    if (!day || day < 1 || day > 31) {
      setError(t.bills.invalidDay);
      return;
    }

    try {
      await createBill.mutateAsync({
        couple_id: coupleId,
        name: name.trim(),
        amount: amountCents,
        due_day: day,
        is_fixed: true,
      });
      onSuccess(name.trim());
    } catch {
      setError(t.bills.createError);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-pink-primary/30 p-5 space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Receipt className="w-5 h-5 text-pink-primary" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t.bills.newBillTitle}</h3>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-primary/10 text-red-primary text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          label={t.profile.name}
          placeholder={t.bills.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label={t.bills.amountPlaceholder}
          type="text"
          inputMode="decimal"
          placeholder="1.500,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          label={t.bills.dueDay}
          type="number"
          min={1}
          max={31}
          placeholder="10"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          {t.common.cancel}
        </Button>
        <Button type="submit" size="sm" loading={createBill.isPending}>
          {t.common.add}
        </Button>
      </div>
    </form>
  );
}
