import { redirect } from "next/navigation";

import { AuthSubmitButton } from "@/app/components/auth-submit-button";
import { addSpending, deleteSpending } from "@/app/dashboard/spending/actions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const CATEGORIES = [
  "Groceries",
  "Dining",
  "Housing",
  "Utilities",
  "Transportation",
  "Subscriptions",
  "Health",
  "Shopping",
  "Travel",
  "Other",
];

const errorMessages: Record<string, string> = {
  "missing-merchant": "Merchant name is required.",
  "invalid-amount": "Amount must be greater than zero.",
  "no-household": "No household found. Please sign out and sign back in.",
  "db-error": "Could not save your transaction. Please try again.",
};

type SpendingRow = {
  id: string;
  merchant: string;
  category: string | null;
  amount: number | string;
  spent_at: string;
  note: string | null;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const shortDayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

type CategorySummary = {
  name: string;
  amount: number;
  share: number;
};

type TrendPoint = {
  label: string;
  amount: number;
};

function formatAmount(amount: number | string) {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return currency.format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toAmount(value: number | string) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildTrendPath(points: TrendPoint[]) {
  if (points.length === 0) return "";

  const width = 100;
  const height = 44;
  const max = Math.max(...points.map((point) => point.amount), 1);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point.amount / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const errorKey = params.error;
  const success = params.success === "added";

  const configured = isSupabaseConfigured();
  let rows: SpendingRow[] = [];
  let monthTotal = 0;
  let weekTotal = 0;
  let topCategory = "No data";
  let categorySummary: CategorySummary[] = [];
  let weeklyTrend: TrendPoint[] = [];

  if (configured) {
    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/sign-in");

    const { data: membership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (membership) {
      const { data } = await admin
        .from("spending_transactions")
        .select("id, merchant, category, amount, spent_at, note")
        .eq("household_id", membership.household_id)
        .order("spent_at", { ascending: false })
        .limit(100);

      rows = (data as SpendingRow[]) ?? [];

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const byCategory = new Map<string, number>();
      const dailyBuckets = new Map<string, number>();

      for (let offset = 0; offset < 7; offset += 1) {
        const day = new Date(sevenDaysAgo);
        day.setDate(sevenDaysAgo.getDate() + offset);
        dailyBuckets.set(day.toISOString().slice(0, 10), 0);
      }

      rows.forEach((row) => {
        const safeAmount = toAmount(row.amount);
        const spentAt = new Date(row.spent_at);
        const spentKey = spentAt.toISOString().slice(0, 10);

        if (spentAt >= startOfMonth) monthTotal += safeAmount;
        if (spentAt >= sevenDaysAgo) weekTotal += safeAmount;
        if (dailyBuckets.has(spentKey)) {
          dailyBuckets.set(spentKey, (dailyBuckets.get(spentKey) ?? 0) + safeAmount);
        }

        const key = row.category || "Other";
        byCategory.set(key, (byCategory.get(key) ?? 0) + safeAmount);
      });

      topCategory =
        [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No data";

      const totalTracked = [...byCategory.values()].reduce((sum, amount) => sum + amount, 0);
      categorySummary = [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({
          name,
          amount,
          share: totalTracked > 0 ? (amount / totalTracked) * 100 : 0,
        }));

      weeklyTrend = [...dailyBuckets.entries()].map(([dateKey, amount]) => ({
        label: shortDayFormatter.format(new Date(`${dateKey}T12:00:00`)),
        amount,
      }));
    }
  }

  const trendPath = buildTrendPath(weeklyTrend);
  const trendMax = Math.max(...weeklyTrend.map((point) => point.amount), 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="panel rounded-[2rem] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">Spending</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Track your spending flow</h1>
        <p className="mt-2 max-w-3xl text-base text-foreground/65">
          Log purchases as they happen and keep your budget signals accurate in real time.
        </p>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-border bg-surface-strong p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">This month</p>
            <p className="numeric mt-2 text-2xl font-semibold">{currency.format(monthTotal)}</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface-strong p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Last 7 days</p>
            <p className="numeric mt-2 text-2xl font-semibold">{currency.format(weekTotal)}</p>
          </article>
          <article className="rounded-2xl border border-border bg-surface-strong p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">Top category</p>
            <p className="mt-2 text-2xl font-semibold">{topCategory}</p>
          </article>
        </section>
      </header>

      {success ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Transaction added.
        </div>
      ) : null}
      {errorKey && errorMessages[errorKey] ? (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger">
          {errorMessages[errorKey]}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">7-day pulse</p>
              <h2 className="mt-2 text-2xl font-semibold">Weekly spend rhythm</h2>
            </div>
            <div className="rounded-full border border-border bg-surface-strong px-3 py-1 text-xs text-foreground/52">
              Peak {compactCurrency.format(trendMax)}
            </div>
          </div>

          <div className="mt-8 rounded-[1.6rem] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,244,235,0.9))] p-5">
            <div className="flex items-end justify-between gap-3 text-xs text-foreground/42">
              <span>Recent activity</span>
              <span>{compactCurrency.format(weekTotal)} total</span>
            </div>

            {weeklyTrend.some((point) => point.amount > 0) ? (
              <>
                <svg viewBox="0 0 100 44" className="mt-5 h-32 w-full overflow-visible" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="spendingTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(15,118,110,0.32)" />
                      <stop offset="100%" stopColor="rgba(15,118,110,0)" />
                    </linearGradient>
                  </defs>
                  <path d="M0,44 H100" stroke="rgba(20,37,29,0.10)" strokeWidth="0.8" />
                  <path d={`${trendPath} L100,44 L0,44 Z`} fill="url(#spendingTrend)" />
                  <path
                    d={trendPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    className="text-accent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-foreground/48">
                  {weeklyTrend.map((point) => (
                    <div key={point.label} className="space-y-1">
                      <p>{point.label}</p>
                      <p className="numeric text-[11px] text-foreground/62">{compactCurrency.format(point.amount)}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[1.2rem] border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/50">
                Add a few transactions to reveal your weekly spending pattern.
              </div>
            )}
          </div>
        </article>

        <article className="panel rounded-[2rem] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">Category mix</p>
          <h2 className="mt-2 text-2xl font-semibold">Where the money is going</h2>

          {categorySummary.length > 0 ? (
            <div className="mt-8 space-y-4">
              {categorySummary.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground/60">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="numeric font-medium">{compactCurrency.format(item.amount)}</p>
                      <p className="text-xs text-foreground/45">{item.share.toFixed(0)}%</p>
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e,#f59e0b)]"
                      style={{ width: `${Math.max(item.share, 6)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-[1.2rem] border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/50">
              Category totals will appear after your first few transactions.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <article className="panel rounded-[2rem] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Add transaction</h2>
          <p className="mt-1 text-sm text-foreground/60">Capture each spend event to keep your dashboard honest.</p>

          <form action={addSpending} className="mt-6 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Merchant</span>
              <input
                type="text"
                name="merchant"
                required
                placeholder="e.g. Whole Foods"
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Category</span>
              <div className="relative">
                <select
                  name="category"
                  defaultValue=""
                  className="w-full appearance-none rounded-[1.1rem] border border-border bg-gradient-to-b from-white to-[#fcfaf4] px-4 py-3 pr-11 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-foreground/45">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M4 6.5L8 10L12 6.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Amount</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                  $
                </span>
                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full rounded-[1.1rem] border border-border bg-white py-3 pl-8 pr-4 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Spent on</span>
              <input
                type="date"
                name="spent_at"
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Note</span>
              <textarea
                name="note"
                rows={3}
                placeholder="Optional details"
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <AuthSubmitButton>Add transaction</AuthSubmitButton>
          </form>
        </article>

        <article className="panel rounded-[2rem] p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Recent spending</h2>
          <p className="mt-1 text-sm text-foreground/60">{rows.length} transaction{rows.length === 1 ? "" : "s"} captured</p>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-foreground/55">
              No transactions yet. Add your first spend event.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-[1.2rem] border border-border bg-surface-strong p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{row.merchant}</p>
                    <p className="mt-1 text-xs text-foreground/55">
                      {row.category || "Uncategorized"} · {formatDate(row.spent_at)}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
                    <p className="numeric text-sm font-semibold">{formatAmount(row.amount)}</p>
                    <form
                      action={async () => {
                        "use server";
                        await deleteSpending(row.id);
                      }}
                    >
                      <button type="submit" className="text-xs text-foreground/40 transition hover:text-danger">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
