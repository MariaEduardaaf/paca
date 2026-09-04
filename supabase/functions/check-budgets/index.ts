import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { budgetAlert, budgetAlertTitles, resolveLang, type BudgetAlertKey } from "../_shared/i18n.ts";
import { timingSafeEqualStr } from "../_shared/crypto.ts";
import { notifyAndPush } from "../_shared/push.ts";

// Cron-only function: scans ALL couples' budgets (service_role) and sends
// budget alerts. It must never be publicly invocable.
//
// REQUIRED SECRET: set CRON_SECRET in the function's env
//   (supabase secrets set CRON_SECRET=<random value>)
// and configure the scheduler to send it as `Authorization: Bearer <CRON_SECRET>`.
// The function FAILS CLOSED (503) when CRON_SECRET is not configured, and
// rejects any request without the matching header (401). Deploying with
// --no-verify-jwt is only safe together with this check.

Deno.serve(async (req) => {
  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret) {
      return new Response(
        JSON.stringify({ error: "CRON_SECRET is not configured; refusing to run" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!timingSafeEqualStr(authHeader, `Bearer ${cronSecret}`)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Get all budgets for the current month (couple + personal)
    const { data: budgets } = await supabase
      .from("budgets")
      .select(`
        id, couple_id, scope, owner_id, total_amount,
        categories:budget_categories(category_id, allocated_amount)
      `)
      .eq("month", currentMonth);

    if (!budgets || budgets.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Prefetch once per run (both are per-couple/per-recipient lookups that
    // would otherwise be N+1 queries inside the loops below):
    // - each couple's primary currency, so spent totals can skip unconverted
    //   foreign-currency rows exactly like the client-side useBudgets does;
    // - every budget_alert already sent this month, keyed user:couple:title,
    //   for the dedup check.
    const coupleIds = Array.from(new Set(budgets.map((b) => b.couple_id)));
    const [couplesRes, sentRes] = await Promise.all([
      supabase.from("couples").select("id, primary_currency").in("id", coupleIds),
      supabase
        .from("notifications")
        .select("target_user_id, couple_id, title")
        .eq("type", "budget_alert")
        .gte("created_at", currentMonth),
    ]);
    if (sentRes.error) {
      // Fail closed on the dedup prefetch: better to miss one run than to
      // spam identical pushes every cron tick while the DB hiccups.
      console.error("budget-alert dedup prefetch failed; aborting run", sentRes.error);
      return new Response(JSON.stringify({ error: "dedup prefetch failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const primaryByCouple = new Map(
      (couplesRes.data ?? []).map((c) => [c.id, c.primary_currency])
    );
    const sentKeys = new Set(
      (sentRes.data ?? []).map((n) => `${n.target_user_id}:${n.couple_id}:${n.title}`)
    );

    let alertsSent = 0;

    for (const budget of budgets) {
      const isPersonal = budget.scope === "personal";

      // Sum transactions matching this budget's scope (and owner for personal).
      let txQuery = supabase
        .from("transactions")
        .select("amount, currency, category_id")
        .eq("couple_id", budget.couple_id)
        .eq("scope", budget.scope ?? "couple")
        .eq("type", "expense")
        .gte("date", currentMonth)
        .lt("date", nextMonth(currentMonth));
      if (isPersonal && budget.owner_id) {
        txQuery = txQuery.eq("paid_by", budget.owner_id);
      }
      const { data: transactions } = await txQuery;
      if (!transactions) continue;

      // Unconverted foreign-currency rows (auto-convert off) can't be added to
      // primary-currency cents — leave them out, matching useBudgets on the
      // client so a push can never contradict the UI.
      const primaryCurrency = primaryByCouple.get(budget.couple_id);
      const totalSpent = transactions.reduce((sum, t) => {
        if (t.currency && primaryCurrency && t.currency !== primaryCurrency) return sum;
        return sum + t.amount;
      }, 0);
      const ratio = totalSpent / budget.total_amount;

      // Personal budgets notify only the owner; couple budgets notify both.
      // We also load each recipient's `language` so the notification can be
      // localized per-user via resolveLang/budgetAlert (../_shared/i18n.ts).
      let recipients: { id: string; language?: string | null }[] = [];
      if (isPersonal && budget.owner_id) {
        const { data: owner } = await supabase
          .from("profiles")
          .select("id, language")
          .eq("id", budget.owner_id)
          .single();
        // Fall back to a bare id so we still notify the owner if the lookup fails.
        recipients = owner ? [owner] : [{ id: budget.owner_id }];
      } else {
        const { data: members } = await supabase
          .from("profiles")
          .select("id, language")
          .eq("couple_id", budget.couple_id);
        recipients = members ?? [];
      }
      if (recipients.length === 0) continue;

      const pct = Math.round(ratio * 100);

      // One alert variant per run: 80% ("near") or 100% ("exceeded").
      const alertKey: BudgetAlertKey | null =
        ratio >= 1.0
          ? (isPersonal ? "exceededPersonal" : "exceededCouple")
          : ratio >= 0.8
            ? (isPersonal ? "nearPersonal" : "nearCouple")
            : null;
      if (!alertKey) continue;

      // Dedup: this function runs on a cron, so without a guard the same
      // couple would get the identical alert on every run. The notifications
      // table has no metadata column, but titles are static per (lang, key),
      // so "a budget_alert this month with any localized title of this key"
      // means this threshold was already announced to this recipient
      // (per user + couple + scope + threshold + calendar month — there is at
      // most one couple budget and one personal budget per user per month).
      // Tested against the sentKeys Set prefetched above (one query per run).
      const dedupTitles = budgetAlertTitles(alertKey);

      for (const member of recipients) {
        const alreadySent = dedupTitles.some((t) =>
          sentKeys.has(`${member.id}:${budget.couple_id}:${t}`)
        );
        if (alreadySent) continue;

        const lang = resolveLang(member.language);
        const { title, body } = budgetAlert(lang, alertKey, pct);
        await notifyAndPush(supabase, {
          couple_id: budget.couple_id,
          target_user_id: member.id,
          type: "budget_alert",
          title,
          body,
        });
        sentKeys.add(`${member.id}:${budget.couple_id}:${title}`);
        alertsSent++;
      }
    }

    return new Response(
      JSON.stringify({ checked: budgets.length, alerts_sent: alertsSent }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao verificar orçamentos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function nextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const nextDate = new Date(year, month, 1); // month is already 1-based, so passing it as-is gives us next month
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;
}
