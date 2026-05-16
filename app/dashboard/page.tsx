import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getDashboardData } from "@/lib/dashboard";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type BillRecord = {
  id: string;
  name: string;
  category: string | null;
  amount_due: number | string | null;
  next_due_on: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentRecord = {
  id: string;
  bill_account_id: string;
  amount_paid: number | string;
  paid_on: string;
  status: "paid" | "pending" | "failed";
  created_at: string;
};

type SpendingRecord = {
  id: string;
  merchant: string;
  category: string | null;
  amount: number | string;
  spent_at: string;
};

type HouseholdMembership = {
  households:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type UpcomingRow = {
  id: string;
  bill: string;
  dueDate: string;
  amount: string;
  status: "Upcoming" | "Paid" | "Overdue";
};

type MonthlyPoint = {
  label: string;
  total: number;
};

type CategorySlice = {
  name: string;
  total: number;
  share: number;
  color: string;
};

type ActionItem = {
  id: string;
  label: string;
  when: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const analyticsCategoryPalette: Record<string, string> = {
  Housing: "#0072e6",
  Food: "#22a06b",
  Subscriptions: "#ea6a15",
  Utilities: "#6b4eff",
};

const analyticsCategories = ["Housing", "Food", "Subscriptions", "Utilities"] as const;

function normalizeCategoryLabel(value: string | null | undefined): (typeof analyticsCategories)[number] | null {
  if (!value) return null;

  const normalized = value.toLowerCase();

  if (
    normalized.includes("housing") ||
    normalized.includes("rent") ||
    normalized.includes("mortgage") ||
    normalized.includes("home")
  ) {
    return "Housing";
  }

  if (
    normalized.includes("food") ||
    normalized.includes("grocery") ||
    normalized.includes("dining") ||
    normalized.includes("restaurant") ||
    normalized.includes("cafe")
  ) {
    return "Food";
  }

  if (
    normalized.includes("subscription") ||
    normalized.includes("stream") ||
    normalized.includes("membership")
  ) {
    return "Subscriptions";
  }

  if (
    normalized.includes("utility") ||
    normalized.includes("electric") ||
    normalized.includes("water") ||
    normalized.includes("gas") ||
    normalized.includes("internet") ||
    normalized.includes("phone")
  ) {
    return "Utilities";
  }

  return null;
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDateOnly(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T12:00:00`);
}

function dayDistance(dateValue: string | null) {
  const dueDate = toDateOnly(dateValue);
  if (!dueDate) return Number.POSITIVE_INFINITY;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(dateValue: string | null) {
  const parsed = toDateOnly(dateValue);
  return parsed ? monthKey(parsed) : null;
}

function parseTimestampMonthKey(dateValue: string) {
  return monthKey(new Date(dateValue));
}

function lastNMonths(total: number) {
  const now = new Date();
  const values: { key: string; label: string }[] = [];

  for (let index = total - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    values.push({ key: monthKey(date), label: monthFormatter.format(date) });
  }

  return values;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const delta = Math.floor((now.getTime() - date.getTime()) / 86_400_000);

  if (delta <= 0) return "Today";
  if (delta === 1) return "1 day ago";
  if (delta < 7) return `${delta} days ago`;
  return fullDateFormatter.format(date);
}

function parseAmountFromCurrency(value: string) {
  const sanitized = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  if (dashboard.requiresAuth) {
    redirect("/sign-in");
  }

  let totalDueThisMonth = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let paidThisMonth = 0;
  let dueTodayCount = 0;
  let dueThisWeekCount = 0;
  let upcomingRows: UpcomingRow[] = [];
  let monthlySeries: MonthlyPoint[] = [];
  let categorySlices: CategorySlice[] = [];
  let reminders: string[] = [];
  let recentActions: ActionItem[] = [];
  let insights: string[] = [];

  if (dashboard.mode === "live" && isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/sign-in");
    }

    const { data: membership } = await admin
      .from("household_members")
      .select("households(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const householdRaw = (membership as HouseholdMembership | null)?.households;
    const household = Array.isArray(householdRaw) ? householdRaw[0] : householdRaw;

    if (household) {
      const [{ data: bills }, { data: payments }, { data: spending }] = await Promise.all([
        admin
          .from("bill_accounts")
          .select("id, name, category, amount_due, next_due_on, created_at, updated_at")
          .eq("household_id", household.id)
          .eq("status", "active")
          .order("next_due_on", { ascending: true, nullsFirst: false })
          .limit(80),
        admin
          .from("bill_payments")
          .select("id, bill_account_id, amount_paid, paid_on, status, created_at")
          .eq("household_id", household.id)
          .order("created_at", { ascending: false })
          .limit(180),
        admin
          .from("spending_transactions")
          .select("id, merchant, category, amount, spent_at")
          .eq("household_id", household.id)
          .order("spent_at", { ascending: false })
          .limit(320),
      ]);

      const billRows = (bills as BillRecord[] | null) ?? [];
      const paymentRows = (payments as PaymentRecord[] | null) ?? [];
      const spendingRows = (spending as SpendingRecord[] | null) ?? [];

      const today = new Date();
      const currentMonth = monthKey(today);
      const previousMonth = monthKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      const monthlyBuckets = new Map(lastNMonths(6).map((point) => [point.key, 0]));

      const billNameById = new Map<string, string>();
      billRows.forEach((bill) => {
        billNameById.set(bill.id, bill.name);
      });

      const latestPaymentByBill = new Map<string, PaymentRecord>();
      for (const payment of paymentRows) {
        if (!latestPaymentByBill.has(payment.bill_account_id)) {
          latestPaymentByBill.set(payment.bill_account_id, payment);
        }
      }

      for (const bill of billRows) {
        const amount = toNumber(bill.amount_due);
        const dueDistance = dayDistance(bill.next_due_on);
        const dueMonth = parseMonthKey(bill.next_due_on);
        const latestPayment = latestPaymentByBill.get(bill.id);
        const paidThisMonthForBill =
          latestPayment?.status === "paid" && parseMonthKey(latestPayment.paid_on) === currentMonth;

        if (dueMonth === currentMonth) {
          totalDueThisMonth += amount;
        }

        if (dueDistance <= 7 && dueDistance >= 0 && !paidThisMonthForBill) {
          upcomingCount += 1;
        }

        if (dueDistance < 0 && !paidThisMonthForBill) {
          overdueCount += 1;
        }

        if (dueDistance === 0 && !paidThisMonthForBill) {
          dueTodayCount += 1;
        }

        if (dueDistance >= 0 && dueDistance <= 7 && !paidThisMonthForBill) {
          dueThisWeekCount += 1;
        }

        const status: UpcomingRow["status"] = paidThisMonthForBill
          ? "Paid"
          : dueDistance < 0
            ? "Overdue"
            : "Upcoming";

        upcomingRows.push({
          id: bill.id,
          bill: bill.name,
          dueDate: bill.next_due_on ? dayFormatter.format(new Date(`${bill.next_due_on}T12:00:00`)) : "No due date",
          amount: currency.format(amount),
          status,
        });
      }

      upcomingRows = upcomingRows
        .sort((left, right) => {
          const rank = (value: UpcomingRow["status"]) => {
            if (value === "Overdue") return 0;
            if (value === "Upcoming") return 1;
            return 2;
          };
          return rank(left.status) - rank(right.status);
        })
        .slice(0, 8);

      for (const payment of paymentRows) {
        if (payment.status === "paid" && parseMonthKey(payment.paid_on) === currentMonth) {
          paidThisMonth += toNumber(payment.amount_paid);
        }

        const paidMonth = parseMonthKey(payment.paid_on);
        if (paidMonth && monthlyBuckets.has(paidMonth) && payment.status === "paid") {
          monthlyBuckets.set(paidMonth, (monthlyBuckets.get(paidMonth) ?? 0) + toNumber(payment.amount_paid));
        }
      }

      for (const transaction of spendingRows) {
        const key = parseTimestampMonthKey(transaction.spent_at);
        if (monthlyBuckets.has(key)) {
          monthlyBuckets.set(key, (monthlyBuckets.get(key) ?? 0) + toNumber(transaction.amount));
        }
      }

      monthlySeries = lastNMonths(6).map((month) => ({
        label: month.label,
        total: monthlyBuckets.get(month.key) ?? 0,
      }));

      const currentMonthCategories = new Map<string, number>(
        analyticsCategories.map((name) => [name, 0]),
      );

      for (const transaction of spendingRows) {
        const key = parseTimestampMonthKey(transaction.spent_at);
        if (key !== currentMonth) continue;

        const categoryName = normalizeCategoryLabel(transaction.category);
        if (!categoryName) continue;

        currentMonthCategories.set(
          categoryName,
          (currentMonthCategories.get(categoryName) ?? 0) + toNumber(transaction.amount),
        );
      }

      for (const bill of billRows) {
        const dueMonth = parseMonthKey(bill.next_due_on);
        if (dueMonth !== currentMonth) continue;

        const categoryName = normalizeCategoryLabel(bill.category);
        if (!categoryName) continue;

        currentMonthCategories.set(
          categoryName,
          (currentMonthCategories.get(categoryName) ?? 0) + toNumber(bill.amount_due),
        );
      }

      const categoryTotal = Array.from(currentMonthCategories.values()).reduce(
        (sum, value) => sum + value,
        0,
      );

      categorySlices = analyticsCategories.map((name) => {
        const total = currentMonthCategories.get(name) ?? 0;
        return {
          name,
          total,
          share: categoryTotal > 0 ? (total / categoryTotal) * 100 : 0,
          color: analyticsCategoryPalette[name],
        };
      });

      reminders = [];
      if (dueTodayCount > 0) {
        reminders.push(`You have ${dueTodayCount} bill${dueTodayCount === 1 ? "" : "s"} due today.`);
      }
      if (dueThisWeekCount > 0) {
        reminders.push(`${dueThisWeekCount} bill${dueThisWeekCount === 1 ? "" : "s"} due this week.`);
      }
      if (overdueCount > 0) {
        reminders.push(`${overdueCount} bill${overdueCount === 1 ? " is" : "s are"} overdue.`);
      }
      if (reminders.length === 0) {
        reminders.push("No urgent bill reminders right now.");
      }

      const actionFeed: Array<{ id: string; at: string; label: string }> = [];

      for (const payment of paymentRows.slice(0, 14)) {
        if (payment.status !== "paid") continue;
        actionFeed.push({
          id: `paid-${payment.id}`,
          at: payment.created_at,
          label: `Paid ${billNameById.get(payment.bill_account_id) ?? "a bill"}`,
        });
      }

      for (const bill of billRows.slice(0, 18)) {
        actionFeed.push({
          id: `added-${bill.id}`,
          at: bill.created_at,
          label: `Added ${bill.name} bill`,
        });

        if (Math.abs(new Date(bill.updated_at).getTime() - new Date(bill.created_at).getTime()) > 60_000) {
          actionFeed.push({
            id: `edited-${bill.id}`,
            at: bill.updated_at,
            label: `Edited ${bill.name} bill`,
          });
        }
      }

      recentActions = actionFeed
        .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
        .slice(0, 7)
        .map((item) => ({
          id: item.id,
          label: item.label,
          when: formatRelativeDate(item.at),
        }));

      const subscriptionCurrent = spendingRows
        .filter(
          (item) =>
            parseTimestampMonthKey(item.spent_at) === currentMonth &&
            (item.category ?? "").toLowerCase().includes("subscription"),
        )
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

      const subscriptionPrevious = spendingRows
        .filter(
          (item) =>
            parseTimestampMonthKey(item.spent_at) === previousMonth &&
            (item.category ?? "").toLowerCase().includes("subscription"),
        )
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

      const topCategory = [...categorySlices].sort((left, right) => right.total - left.total)[0];

      if (subscriptionPrevious > 0) {
        const change = Math.round(
          ((subscriptionCurrent - subscriptionPrevious) / subscriptionPrevious) * 100,
        );
        if (change > 0) {
          insights.push(`Your subscription spending increased ${change}% this month.`);
        } else if (change < 0) {
          insights.push(`Your subscription spending dropped ${Math.abs(change)}% this month.`);
        }
      }

      if (topCategory && topCategory.total > 0) {
        insights.push(`You spent most on ${topCategory.name} this month.`);
      }

      if (overdueCount > 0) {
        insights.push(`Clearing overdue bills first can quickly reduce financial stress this week.`);
      }
    }
  } else {
    totalDueThisMonth = dashboard.bills.reduce(
      (sum, bill) => sum + parseAmountFromCurrency(bill.amount),
      0,
    );

    overdueCount = dashboard.bills.filter((bill) => bill.tone === "danger").length;
    upcomingCount = dashboard.bills.filter((bill) => bill.tone !== "danger").length;
    paidThisMonth = dashboard.activity.reduce(
      (sum, item) => sum + parseAmountFromCurrency(item.amount),
      0,
    );

    dueTodayCount = dashboard.bills.filter((bill) => bill.dueLabel.toLowerCase().includes("today")).length;
    dueThisWeekCount = dashboard.bills.filter((bill) => {
      const due = bill.dueLabel.toLowerCase();
      return due.includes("today") || due.includes("tomorrow") || due.includes("due may");
    }).length;

    upcomingRows = dashboard.bills.slice(0, 8).map((bill) => ({
      id: bill.id,
      bill: bill.name,
      dueDate: bill.dueLabel.replace("Due ", ""),
      amount: bill.amount,
      status: bill.tone === "danger" ? "Overdue" : "Upcoming",
    }));

    monthlySeries = [
      { label: "Dec", total: 3180 },
      { label: "Jan", total: 3420 },
      { label: "Feb", total: 3340 },
      { label: "Mar", total: 3670 },
      { label: "Apr", total: 3510 },
      { label: "May", total: 3920 },
    ];

    const categoryByName = new Map(
      dashboard.categories.map((item) => [item.name, parseAmountFromCurrency(item.amount)]),
    );

    categorySlices = analyticsCategories.map((name) => {
      const total = categoryByName.get(name) ?? 0;
      const all = analyticsCategories.reduce((sum, label) => sum + (categoryByName.get(label) ?? 0), 0);
      return {
        name,
        total,
        share: all > 0 ? (total / all) * 100 : 0,
        color: analyticsCategoryPalette[name],
      };
    });

    reminders = [
      dueTodayCount > 0
        ? `You have ${dueTodayCount} bill${dueTodayCount === 1 ? "" : "s"} due today.`
        : "No bills due today.",
      dueThisWeekCount > 0
        ? `${dueThisWeekCount} bill${dueThisWeekCount === 1 ? "" : "s"} due this week.`
        : "No bills due this week.",
    ];

    recentActions = [
      { id: "demo-1", label: "Paid Spotify bill", when: "Today" },
      { id: "demo-2", label: "Added Internet bill", when: "Yesterday" },
      { id: "demo-3", label: "Edited Electricity bill", when: "2 days ago" },
      ...dashboard.activity.slice(0, 4).map((item) => ({
        id: item.id,
        label: `Added ${item.title}`,
        when: "This week",
      })),
    ];

    insights = [
      "Your subscription spending increased 15% this month.",
      "You spent most on Housing.",
    ];
  }

  const monthlyMax = Math.max(...monthlySeries.map((point) => point.total), 1);
  const monthlyHasData = monthlySeries.some((point) => point.total > 0);
  const categoryHasData = categorySlices.some((slice) => slice.total > 0);

  const pieGradient = (() => {
    const positiveSlices = categorySlices.filter((slice) => slice.share > 0);
    const segments = positiveSlices.map((slice, index) => {
      const start = positiveSlices
        .slice(0, index)
        .reduce((sum, current) => sum + current.share, 0);
      const end = start + slice.share;
      return `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    });

    return segments.length > 0
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#d7eaff 0% 100%)";
  })();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
      <header className="panel rounded-4xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/48">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Your monthly billing snapshot</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/68 sm:text-base">
          A cleaner view of what is due, what is paid, and where your money is going.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Total Bills This Month</p>
          <p className="numeric mt-3 text-3xl font-semibold">{currency.format(totalDueThisMonth)}</p>
          <p className="mt-2 text-sm text-foreground/62">due this month</p>
        </article>

        <article className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Upcoming Bills</p>
          <p className="numeric mt-3 text-3xl font-semibold">{upcomingCount}</p>
          <p className="mt-2 text-sm text-foreground/62">upcoming bills</p>
        </article>

        <article className="rounded-3xl border border-danger/30 bg-danger-soft p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-danger/85">Overdue Bills</p>
          <p className="numeric mt-3 text-3xl font-semibold text-danger">{overdueCount}</p>
          <p className="mt-2 text-sm text-danger/85">overdue bills</p>
        </article>

        <article className="panel rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Paid This Month</p>
          <p className="numeric mt-3 text-3xl font-semibold">{currency.format(paidThisMonth)}</p>
          <p className="mt-2 text-sm text-foreground/62">paid</p>
        </article>
      </section>

      <section id="upcoming-bills" className="panel rounded-4xl p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Upcoming Bills</p>
            <h2 className="mt-1 text-2xl font-semibold">Due dates and status</h2>
          </div>
          <Link
            href="/dashboard/bills"
            className="rounded-full border border-border bg-surface-strong px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            View all bills
          </Link>
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-3xl border border-border md:block">
          <table className="w-full border-collapse">
            <thead className="bg-surface-strong text-left text-xs uppercase tracking-[0.16em] text-foreground/50">
              <tr>
                <th className="px-4 py-3 font-medium">Bill</th>
                <th className="px-4 py-3 font-medium">Due Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {upcomingRows.map((row) => (
                <tr key={row.id} className="border-t border-border/80 text-sm">
                  <td className="px-4 py-3 font-medium">{row.bill}</td>
                  <td className="px-4 py-3 text-foreground/72">{row.dueDate}</td>
                  <td className="numeric px-4 py-3">{row.amount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        row.status === "Overdue"
                          ? "bg-danger-soft text-danger"
                          : row.status === "Paid"
                            ? "bg-accent-soft text-accent-strong"
                            : "bg-signal-soft text-signal"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 space-y-3 md:hidden">
          {upcomingRows.map((row) => (
            <article key={row.id} className="rounded-2xl border border-border bg-surface-strong p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{row.bill}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    row.status === "Overdue"
                      ? "bg-danger-soft text-danger"
                      : row.status === "Paid"
                        ? "bg-accent-soft text-accent-strong"
                        : "bg-signal-soft text-signal"
                  }`}
                >
                  {row.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-foreground/68">
                <p>{row.dueDate}</p>
                <p className="numeric font-medium text-foreground">{row.amount}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-4xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Spending Analytics</p>
          <h2 className="mt-1 text-2xl font-semibold">Monthly spending chart</h2>

          {monthlyHasData ? (
            <div className="mt-6 space-y-3 rounded-3xl border border-border bg-surface-strong p-4 sm:p-5">
              {monthlySeries.map((point) => (
                <div key={point.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-foreground/58">
                    <span>{point.label}</span>
                    <span className="numeric">{currency.format(point.total)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-strong))]"
                      style={{ width: `${Math.max((point.total / monthlyMax) * 100, 6)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface-strong px-4 py-8 text-center text-sm text-foreground/55">
              Add payments or transactions to populate monthly analytics.
            </div>
          )}
        </article>

        <article className="panel rounded-4xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Category Breakdown</p>
          <h2 className="mt-1 text-2xl font-semibold">Where money goes</h2>

          {categoryHasData ? (
            <div className="mt-6 grid gap-5 md:grid-cols-[auto_1fr] md:items-start">
              <div className="flex items-center justify-center">
                <div className="relative h-28 w-28 sm:h-32 sm:w-32" aria-label="Spending category donut chart">
                  <div
                    className="h-full w-full rounded-full border border-border"
                    style={{ backgroundImage: pieGradient }}
                  />
                  <div className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface-strong sm:h-13 sm:w-13" />
                </div>
              </div>

              <div className="w-full space-y-3">
                {categorySlices.map((slice) => (
                  <div key={slice.name} className="rounded-2xl border border-border bg-surface-strong p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span>{slice.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="numeric font-medium">{currency.format(slice.total)}</p>
                        <p className="text-xs text-foreground/50">{slice.share.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(slice.share, 4)}%`, backgroundColor: slice.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-surface-strong px-4 py-8 text-center text-sm text-foreground/55">
              No category data yet. Add categorized bills or spending records.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel rounded-4xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Reminder Section</p>
          <h2 className="mt-1 text-2xl font-semibold">What needs attention</h2>
          <div className="mt-5 space-y-3">
            {reminders.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-sm text-foreground/75">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="panel rounded-4xl p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Recent Activity</p>
          <h2 className="mt-1 text-2xl font-semibold">Latest actions</h2>
          <div className="mt-5 space-y-3">
            {recentActions.length > 0 ? (
              recentActions.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-strong px-4 py-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-foreground/55">{item.when}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-foreground/55">
                No recent actions yet.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="panel rounded-4xl p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/50">Quick Actions</p>
        <h2 className="mt-1 text-2xl font-semibold">Move faster</h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/bills"
            className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            Add Bill
          </Link>
          <Link
            href="/dashboard/bills?status=pending"
            className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            Mark as Paid
          </Link>
          <Link
            href="/dashboard#upcoming-bills"
            className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            View Calendar
          </Link>
          <Link
            href="/dashboard/spending"
            className="rounded-2xl border border-border bg-surface-strong px-4 py-3 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            View Analytics
          </Link>
        </div>
      </section>

      {insights.length > 0 ? (
        <section className="rounded-4xl border border-accent/25 bg-accent-soft p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-strong/80">Financial Insights</p>
          <h2 className="mt-1 text-2xl font-semibold text-accent-strong">Premium signals</h2>
          <div className="mt-4 space-y-2">
            {insights.map((item) => (
              <p key={item} className="text-sm text-accent-strong/88">
                {item}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <Link
        href="/dashboard/bills"
        className="fixed bottom-6 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-white shadow-[0_16px_36px_rgba(0,114,230,0.42)] transition hover:bg-accent-strong lg:hidden"
        aria-label="Add bill"
      >
        +
      </Link>
    </main>
  );
}
