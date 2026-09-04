import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, supabase } from "@paca/api";
import { formatLocalDate } from "@paca/shared";
import { isAdminEmail } from "@/lib/admin";
import {
  Activity,
  ScanLine,
  Sparkles,
  Lightbulb,
  PlusCircle,
  Users as UsersIcon,
  TrendingUp,
} from "lucide-react";

// ---- Types ----

type UsageAction = "scan_receipt" | "scan_statement" | "advise" | "transaction_added";

interface UsageRow {
  id: string;
  profile_id: string;
  couple_id: string | null;
  action: UsageAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  user_id: string;
  couple_id: string | null;
  display_name: string;
  created_at: string;
}

// ---- Helpers ----

// Very rough per-action cost in EUR, based on Gemini 2.5 Flash pricing.
// We don't actually charge users — this is just to monitor AI cost trends.
const COST_ESTIMATE_EUR: Record<UsageAction, number> = {
  scan_receipt: 0.0002,     // ~0.02¢ per scan
  scan_statement: 0.0005,   // bigger prompt, more output tokens
  advise: 0.0001,           // mostly text, small
  transaction_added: 0,     // no AI
};

const ACTION_LABEL: Record<UsageAction, string> = {
  scan_receipt: "Recibos",
  scan_statement: "Extratos",
  advise: "Conselheiro",
  transaction_added: "Manuais",
};

const ACTION_ICON: Record<UsageAction, typeof Activity> = {
  scan_receipt: ScanLine,
  scan_statement: Sparkles,
  advise: Lightbulb,
  transaction_added: PlusCircle,
};

const ACTION_COLOR: Record<UsageAction, string> = {
  scan_receipt: "from-purple-500 to-indigo-500",
  scan_statement: "from-pink-primary to-pink-light",
  advise: "from-indigo-500 to-blue-500",
  transaction_added: "from-emerald-400 to-teal-500",
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

// Local YYYY-MM-DD — toISOString() is the UTC day and shifts every bucket for
// admins in UTC+ timezones.
const localDayKey = formatLocalDate;

// ---- Page ----

export function AdminUsagePage() {
  const { user, loading: authLoading } = useAuth();
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = isAdminEmail(user?.email ?? null);

  useEffect(() => {
    if (!isAdmin) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usageRes, profilesRes] = await Promise.all([
          supabase
            .from("usage_stats")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5000),
          supabase.from("profiles").select("*"),
        ]);
        if (usageRes.error) throw usageRes.error;
        if (profilesRes.error) throw profilesRes.error;
        setUsage((usageRes.data ?? []) as UsageRow[]);
        setProfiles((profilesRes.data ?? []) as ProfileRow[]);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isAdmin]);

  const profileById = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    for (const p of profiles) map.set(p.id, p);
    return map;
  }, [profiles]);

  const totals = useMemo(() => {
    const init = {
      scan_receipt: 0,
      scan_statement: 0,
      advise: 0,
      transaction_added: 0,
    } as Record<UsageAction, number>;
    for (const r of usage) init[r.action] = (init[r.action] ?? 0) + 1;
    return init;
  }, [usage]);

  const last30Totals = useMemo(() => {
    const cutoff = daysAgo(30).getTime();
    const init = {
      scan_receipt: 0,
      scan_statement: 0,
      advise: 0,
      transaction_added: 0,
    } as Record<UsageAction, number>;
    for (const r of usage) {
      if (new Date(r.created_at).getTime() >= cutoff) {
        init[r.action] = (init[r.action] ?? 0) + 1;
      }
    }
    return init;
  }, [usage]);

  const activeProfileIds = useMemo(() => {
    return new Set(usage.map((u) => u.profile_id));
  }, [usage]);

  const perUser = useMemo(() => {
    // Aggregate by profile
    const cutoff = daysAgo(30).getTime();
    const map = new Map<
      string,
      {
        profile: ProfileRow | null;
        total: number;
        last30: number;
        byAction: Record<UsageAction, number>;
        lastAt: string | null;
        costEstimateEur: number;
      }
    >();
    for (const r of usage) {
      let entry = map.get(r.profile_id);
      if (!entry) {
        entry = {
          profile: profileById.get(r.profile_id) ?? null,
          total: 0,
          last30: 0,
          byAction: {
            scan_receipt: 0,
            scan_statement: 0,
            advise: 0,
            transaction_added: 0,
          },
          lastAt: null,
          costEstimateEur: 0,
        };
        map.set(r.profile_id, entry);
      }
      entry.total += 1;
      entry.byAction[r.action] += 1;
      entry.costEstimateEur += COST_ESTIMATE_EUR[r.action] ?? 0;
      if (new Date(r.created_at).getTime() >= cutoff) entry.last30 += 1;
      if (!entry.lastAt || entry.lastAt < r.created_at) entry.lastAt = r.created_at;
    }
    return Array.from(map.values()).sort((a, b) => b.last30 - a.last30);
  }, [usage, profileById]);

  const timeline = useMemo(() => {
    // Last 28 days, bucket by calendar day
    const days: { date: Date; key: string; count: number }[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = daysAgo(i);
      days.push({
        date: d,
        key: localDayKey(d),
        count: 0,
      });
    }
    const dayMap = new Map(days.map((d) => [d.key, d]));
    for (const r of usage) {
      const key = localDayKey(new Date(r.created_at));
      const day = dayMap.get(key);
      if (day) day.count += 1;
    }
    return days;
  }, [usage]);

  const maxDay = Math.max(1, ...timeline.map((d) => d.count));

  const distribution = useMemo(() => {
    // Bucket users by last30 usage
    const buckets = [
      { label: "0 acções", min: 0, max: 0, count: 0 },
      { label: "1–4", min: 1, max: 4, count: 0 },
      { label: "5–19", min: 5, max: 19, count: 0 },
      { label: "20–49", min: 20, max: 49, count: 0 },
      { label: "50+", min: 50, max: Infinity, count: 0 },
    ];
    for (const p of perUser) {
      for (const b of buckets) {
        if (p.last30 >= b.min && p.last30 <= b.max) {
          b.count += 1;
          break;
        }
      }
    }
    return buckets;
  }, [perUser]);

  const estimatedTotalCost = useMemo(() => {
    return usage.reduce((s, r) => s + (COST_ESTIMATE_EUR[r.action] ?? 0), 0);
  }, [usage]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="max-w-6xl mx-auto page-enter min-w-0">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-primary to-pink-light flex items-center justify-center shadow-lg shadow-pink-primary/25">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-gray-800 dark:text-gray-100">
            Usage analytics
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Só você vê isso. Use pra decidir os limites do Paca Free.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Carregando…</div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-primary/10 text-red-primary text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Top-line totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {(Object.keys(ACTION_LABEL) as UsageAction[]).map((key) => {
              const Icon = ACTION_ICON[key];
              return (
                <div
                  key={key}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 min-w-0"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ACTION_COLOR[key]} flex items-center justify-center shrink-0`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 font-medium truncate">
                      {ACTION_LABEL[key]}
                    </span>
                  </div>
                  <p className="text-2xl font-display font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                    {totals[key]}
                  </p>
                  <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">
                    {last30Totals[key]} nos últimos 30d
                  </p>
                </div>
              );
            })}
          </div>

          {/* Overview row: active users + estimated cost + timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <UsersIcon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Usuários ativos</span>
              </div>
              <p className="text-3xl font-display font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                {activeProfileIds.size}
              </p>
              <p className="text-[11px] text-gray-400 tabular-nums mt-1">
                {profiles.length} perfis no total
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">
                  Custo IA estimado (acumulado)
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                €{estimatedTotalCost.toFixed(4)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Estimativa bem conservadora (Gemini 2.5 Flash).
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Total de eventos</span>
              </div>
              <p className="text-3xl font-display font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                {usage.length}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">desde o primeiro evento</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 mb-6">
            <h2 className="text-sm font-display font-bold text-gray-800 dark:text-gray-100 mb-4">
              Eventos por dia (28 dias)
            </h2>
            <div className="flex items-end gap-1 h-32">
              {timeline.map((d) => {
                const height = Math.max(2, Math.round((d.count / maxDay) * 100));
                return (
                  <div
                    key={d.key}
                    className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0"
                    title={`${d.key}: ${d.count} eventos`}
                  >
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-pink-primary to-pink-light"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-gray-400 tabular-nums">
              <span>{timeline[0]?.key}</span>
              <span>{timeline[timeline.length - 1]?.key}</span>
            </div>
          </div>

          {/* Distribution buckets */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 mb-6">
            <h2 className="text-sm font-display font-bold text-gray-800 dark:text-gray-100 mb-4">
              Distribuição de uso (30d)
            </h2>
            <div className="space-y-3">
              {distribution.map((b) => {
                const total = distribution.reduce((s, x) => s + x.count, 0) || 1;
                const percent = Math.round((b.count / total) * 100);
                return (
                  <div key={b.label} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                      {b.label}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-primary to-pink-light"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-16 text-xs text-gray-500 dark:text-gray-400 tabular-nums text-right shrink-0">
                      {b.count} · {percent}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-user table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-10">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-display font-bold text-gray-800 dark:text-gray-100">
                Uso por usuário
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Ordenado por eventos nos últimos 30 dias
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/30 text-[11px] uppercase text-gray-400 tracking-wide">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Nome</th>
                    <th className="text-right px-3 py-3 font-semibold">Recibos</th>
                    <th className="text-right px-3 py-3 font-semibold">Extratos</th>
                    <th className="text-right px-3 py-3 font-semibold">Advisor</th>
                    <th className="text-right px-3 py-3 font-semibold">Manuais</th>
                    <th className="text-right px-3 py-3 font-semibold">30d</th>
                    <th className="text-right px-3 py-3 font-semibold">Total</th>
                    <th className="text-right px-3 py-3 font-semibold">Custo €</th>
                    <th className="text-right px-5 py-3 font-semibold">Último</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {perUser.map((row) => (
                    <tr
                      key={row.profile?.id ?? Math.random()}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                          {row.profile?.display_name ?? "—"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono truncate">
                          {row.profile?.id?.slice(0, 8) ?? ""}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {row.byAction.scan_receipt}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {row.byAction.scan_statement}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {row.byAction.advise}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {row.byAction.transaction_added}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold text-pink-primary">
                        {row.last30}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                        {row.total}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                        €{row.costEstimateEur.toFixed(4)}
                      </td>
                      <td className="px-5 py-3 text-right text-[11px] text-gray-400 tabular-nums whitespace-nowrap">
                        {row.lastAt
                          ? new Date(row.lastAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                  {perUser.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-12 text-center text-sm text-gray-400"
                      >
                        Sem eventos registrados ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
