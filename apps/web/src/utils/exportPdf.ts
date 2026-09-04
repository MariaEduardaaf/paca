import { getTranslations, type TranslationKeys, type Locale } from "@paca/shared";
import type { TransactionWithCategory } from "@paca/shared";
import { splitByCurrency, formatForeignBreakdown } from "@/utils/currencyBreakdown";

type CategoryTranslator = (
  nameOrCategory:
    | string
    | { name?: string | null; name_translations?: Record<string, string> | null }
    | null
    | undefined
) => string;

/** i18n context from useI18n(), passed by the caller so the PDF follows the
 * active locale and the couple's primary currency instead of pt-BR/BRL. */
export interface PdfI18nContext {
  t: TranslationKeys;
  locale: Locale;
  formatCurrency: (value: number, overrideCurrency?: string | null) => string;
  formatDate: (dateStr: string) => string;
  formatMonthYear: (dateStr: string) => string;
  translateCategory: CategoryTranslator;
  /** BCP-47 tag for the active locale, e.g. "pt-BR". */
  dateLocale: string;
  /** The couple's primary currency code, e.g. "BRL". */
  primaryCurrency: string;
}

// jsPDF's standard fonts only cover Latin-1; anything outside it (Cyrillic
// labels, ₽/₴ symbols, narrow spaces) renders as garbage.
function isLatin1(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 255) return false;
  }
  return true;
}

export async function exportMonthlyReport(
  transactions: TransactionWithCategory[],
  month: string,
  coupleName: string,
  i18n: PdfI18nContext
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();

  // Labels: use the active locale when its output survives Latin-1 (en/pt),
  // otherwise fall back to English so RU/UK users don't get mojibake.
  const latinSafeLocale = i18n.locale === "ru" || i18n.locale === "uk";
  const t = latinSafeLocale ? getTranslations("en") : i18n.t;

  const safe = (s: string, fallback: string) => (isLatin1(s) ? s : fallback);

  // Money: prefer the app formatter; when its output has non-Latin-1 chars
  // (₽, ₴, narrow spaces), re-format with the ASCII currency code.
  const codeFormatters = new Map<string, Intl.NumberFormat>();
  const pdfMoney = (value: number, currency?: string | null) => {
    const formatted = i18n.formatCurrency(value, currency).replace(/[\u202f\u00a0]/g, " ");
    if (isLatin1(formatted)) return formatted;
    const cur = (currency ?? i18n.primaryCurrency).toUpperCase();
    let fmt = codeFormatters.get(cur);
    if (!fmt) {
      try {
        fmt = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: cur,
          currencyDisplay: "code",
        });
      } catch {
        fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 });
      }
      codeFormatters.set(cur, fmt);
    }
    return fmt.format(value / 100).replace(/[\u202f\u00a0]/g, " ");
  };

  const pdfDate = (dateStr: string) => safe(i18n.formatDate(dateStr), dateStr);
  const pdfCategory = (tx: TransactionWithCategory) => {
    const label = i18n.translateCategory(tx.category) || tx.category?.name || "—";
    return safe(label, tx.category?.name ?? "—");
  };

  // Headline totals only within the primary currency; excluded foreign
  // amounts are surfaced in a breakdown line so no money silently disappears.
  const { primary, foreign } = splitByCurrency(transactions, i18n.primaryCurrency);
  const income = primary
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);
  const expenses = primary
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);
  const balance = income - expenses;

  const monthLabel = safe(i18n.formatMonthYear(month), month);

  // Header
  doc.setFontSize(22);
  doc.setTextColor(255, 143, 177); // pink-primary
  doc.text("Paca Finance", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`${t.pdf.monthlyReport} — ${monthLabel}`, 14, 30);
  doc.text(safe(coupleName, "Paca"), 14, 36);

  // Summary boxes
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.text(`${t.transactions.incomes}:`, 14, 50);
  doc.setTextColor(78, 205, 196);
  doc.text(pdfMoney(income), 50, 50);

  doc.setTextColor(50, 50, 50);
  doc.text(`${t.transactions.expenses}:`, 90, 50);
  doc.setTextColor(255, 107, 107);
  doc.text(pdfMoney(expenses), 126, 50);

  doc.setTextColor(50, 50, 50);
  doc.text(`${t.transactions.balance}:`, 166, 50);
  doc.setTextColor(balance >= 0 ? 78 : 255, balance >= 0 ? 205 : 107, balance >= 0 ? 196 : 107);
  doc.text(pdfMoney(balance), 186, 50);

  // Foreign-currency amounts excluded from the totals above
  let separatorY = 55;
  if (foreign.size > 0) {
    const breakdown = formatForeignBreakdown(foreign, pdfMoney);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${t.transactions.otherCurrenciesNote} ${breakdown}`, 14, 56);
    separatorY = 59;
  }

  // Line separator
  doc.setDrawColor(230, 230, 230);
  doc.line(14, separatorY, 196, separatorY);

  // Table
  const rows = transactions.map((tx) => [
    pdfDate(tx.date),
    safe(tx.description, "—"),
    pdfCategory(tx),
    tx.type === "income" ? t.transactions.income : t.transactions.expense,
    safe(tx.paid_by_profile?.display_name ?? "—", "—"),
    (tx.type === "expense" ? "- " : "+ ") + pdfMoney(tx.amount, tx.currency),
  ]);

  autoTable(doc, {
    startY: separatorY + 5,
    head: [
      [
        t.transactions.date,
        t.transactions.description,
        t.transactions.category,
        t.pdf.type,
        t.transactions.whoPaid,
        t.transactions.amountLabel,
      ],
    ],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [255, 143, 177],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [252, 248, 250],
    },
    columnStyles: {
      5: { halign: "right" },
    },
  });

  // Category breakdown (primary currency only)
  const catMap = new Map<string, number>();
  for (const tx of primary) {
    if (tx.type !== "expense") continue;
    const name = pdfCategory(tx);
    catMap.set(name, (catMap.get(name) ?? 0) + tx.amount);
  }

  if (catMap.size > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY ?? 120;
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(t.dashboard.spendingByCategory, 14, finalY + 15);

    const catRows = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => [
        name,
        pdfMoney(amount),
        expenses > 0 ? `${Math.round((amount / expenses) * 100)}%` : "0%",
      ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [[t.transactions.category, t.bills.totalMonth, "%"]],
      body: catRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [255, 143, 177],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
    });
  }

  // Footer
  const generatedOn = new Date().toLocaleDateString(
    latinSafeLocale ? "en-US" : i18n.dateLocale
  );
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Paca Finance — ${t.pdf.generatedAt} ${generatedOn}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`paca-finance-${month}.pdf`);
}
