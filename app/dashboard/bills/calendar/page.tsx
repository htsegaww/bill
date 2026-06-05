import Link from "next/link";
import { redirect } from "next/navigation";

import {
  formatAmount,
  formatDate,
  getActiveBillsData,
  type BillWithState,
} from "@/app/dashboard/bills/data";

const dayNameFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const monthLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const dayNumberFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric" });

const statusToneClasses = {
  paid: "bg-accent-soft text-accent-strong",
  pending: "bg-signal-soft text-signal",
  overdue: "bg-danger-soft text-danger",
};

function monthKeyFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateKeyFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseMonthParam(monthParam: string | undefined) {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [yearRaw, monthRaw] = monthParam.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(year, month - 1, 1);
}

function buildCalendarDays(monthStart: Date) {
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    return current;
  });
}

function toDisplayStatus(value: BillWithState["displayStatus"]) {
  return value[0].toUpperCase() + value.slice(1);
}

type CalendarSearchParams = {
  month?: string;
  date?: string;
};

export default async function BillsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearchParams>;
}) {
  const params = await searchParams;
  const selectedMonth = parseMonthParam(params.month);
  const monthKey = monthKeyFromDate(selectedMonth);

  const { configured, hasHousehold, billRows } = await getActiveBillsData();

  if (!configured) {
    redirect("/dashboard/bills/add");
  }

  const billsWithDate = billRows.filter((row) => !!row.bill.next_due_on);
  const dueMap = new Map<string, BillWithState[]>();

  for (const row of billsWithDate) {
    const key = row.bill.next_due_on as string;
    const existing = dueMap.get(key) ?? [];
    existing.push(row);
    dueMap.set(key, existing);
  }

  const monthDueKeys = [...dueMap.keys()]
    .filter((key) => key.startsWith(monthKey))
    .sort((a, b) => (a < b ? -1 : 1));

  const todayKey = dateKeyFromDate(new Date());
  const defaultSelectedDate =
    monthDueKeys[0] ?? (todayKey.startsWith(monthKey) ? todayKey : `${monthKey}-01`);

  const selectedDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date.startsWith(monthKey)
      ? params.date
      : defaultSelectedDate;

  const selectedRows = (dueMap.get(selectedDate) ?? []).sort((left, right) => {
    const leftAmount = Number(left.bill.amount_due ?? 0);
    const rightAmount = Number(right.bill.amount_due ?? 0);
    return rightAmount - leftAmount;
  });

  const calendarDays = buildCalendarDays(selectedMonth);
  const previousMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
  const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
  const selectedDateLabel = formatDate(selectedDate);
  const thisMonthRows = billsWithDate.filter(
    (row) => (row.bill.next_due_on as string).startsWith(monthKey),
  );
  const thisMonthPaidCount = thisMonthRows.filter((row) => row.displayStatus === "paid").length;
  const thisMonthOverdueCount = thisMonthRows.filter((row) => row.displayStatus === "overdue").length;
  const selectedPaidCount = selectedRows.filter((row) => row.displayStatus === "paid").length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8 sm:px-10">
      <header className="panel rounded-4xl border border-border/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(214,234,255,0.55))] p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">Bills</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Calendar</h1>
            <p className="mt-2 text-sm text-foreground/65">
              Browse due dates and click any day to view paid and unpaid bills.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:min-w-72">
            <div className="rounded-2xl border border-border/80 bg-white/85 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/45">This month</p>
              <p className="mt-1 text-xl font-semibold">{thisMonthRows.length}</p>
              <p className="text-xs text-foreground/55">bills scheduled</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-white/85 px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/45">Paid</p>
              <p className="mt-1 text-xl font-semibold text-accent-strong">{thisMonthPaidCount}</p>
              <p className="text-xs text-foreground/55">completed</p>
            </div>
          </div>
        </div>
      </header>

      {hasHousehold ? (
        <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <article className="panel rounded-4xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Link
                href={`/dashboard/bills/calendar?month=${monthKeyFromDate(previousMonth)}`}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground/70 transition hover:border-accent hover:text-accent"
              >
                ← Prev
              </Link>

              <h2 className="text-xl font-semibold">{monthLabelFormatter.format(selectedMonth)}</h2>

              <Link
                href={`/dashboard/bills/calendar?month=${monthKeyFromDate(nextMonth)}`}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground/70 transition hover:border-accent hover:text-accent"
              >
                Next →
              </Link>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-accent" /> Selected
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-danger" /> Overdue
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1">
                <span className="h-2 w-2 rounded-full bg-accent-strong" /> Paid
              </span>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, index) => {
                const day = new Date(2026, 4, 3 + index);
                return (
                  <p key={index} className="px-2 py-1 text-center text-xs uppercase tracking-[0.2em] text-foreground/45">
                    {dayNameFormatter.format(day)}
                  </p>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => {
                const dayKey = dateKeyFromDate(day);
                const inMonth = monthKeyFromDate(day) === monthKey;
                const billsOnDay = dueMap.get(dayKey) ?? [];
                const isSelected = dayKey === selectedDate;
                const isToday = dayKey === todayKey;
                const hasPaid = billsOnDay.some((row) => row.displayStatus === "paid");
                const hasOverdue = billsOnDay.some((row) => row.displayStatus === "overdue");

                return (
                  <Link
                    key={dayKey}
                    href={`/dashboard/bills/calendar?month=${monthKey}&date=${dayKey}`}
                    className={[
                      "group min-h-22 rounded-2xl border px-2.5 py-2.5 transition",
                      inMonth
                        ? "border-border bg-surface-strong"
                        : "border-border/45 bg-white/40 text-foreground/40",
                      isSelected
                        ? "border-accent bg-accent-soft text-accent-strong shadow-[0_10px_24px_rgba(0,114,230,0.16)]"
                        : "hover:border-accent/45 hover:bg-white",
                      isToday && !isSelected ? "ring-1 ring-accent/35" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{dayNumberFormatter.format(day)}</p>
                      {isToday ? (
                        <span className="rounded-full bg-accent/12 px-1.5 py-0.5 text-[10px] font-medium text-accent-strong">
                          Today
                        </span>
                      ) : null}
                    </div>
                    {billsOnDay.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/65">
                          {billsOnDay.length} due
                        </span>
                        {hasOverdue ? <span className="h-2 w-2 rounded-full bg-danger" /> : null}
                        {!hasOverdue && hasPaid ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                        {!hasOverdue && !hasPaid ? <span className="h-2 w-2 rounded-full bg-signal" /> : null}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </article>

          <aside className="panel rounded-4xl p-5 sm:sticky sm:top-28 sm:self-start sm:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">Selected date</p>
            <h2 className="mt-2 text-2xl font-semibold">{selectedDateLabel}</h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-border bg-white px-2.5 py-2 text-center">
                <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/45">Due</p>
                <p className="mt-0.5 text-base font-semibold">{selectedRows.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-accent-soft/70 px-2.5 py-2 text-center">
                <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/45">Paid</p>
                <p className="mt-0.5 text-base font-semibold text-accent-strong">{selectedPaidCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-danger-soft/65 px-2.5 py-2 text-center">
                <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/45">Overdue</p>
                <p className="mt-0.5 text-base font-semibold text-danger">{thisMonthOverdueCount}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {selectedRows.length > 0 ? (
                selectedRows.map(({ bill, displayStatus }, index) => (
                  <article key={bill.id} className="rounded-2xl border border-border bg-surface-strong p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-foreground/70">
                            {index + 1}
                          </span>
                          {bill.name}
                        </p>
                        <p className="mt-1 text-sm text-foreground/58">
                          {[bill.provider, bill.category].filter(Boolean).join(" · ") || "No extra details"}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusToneClasses[displayStatus]}`}>
                        {toDisplayStatus(displayStatus)}
                      </span>
                    </div>
                    <p className="numeric mt-3 text-lg font-medium">{formatAmount(bill.amount_due)}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-foreground/55">
                      <span>Due {bill.next_due_on ? formatDate(bill.next_due_on) : "—"}</span>
                      <Link
                        href="/dashboard/bills/active"
                        className="rounded-full border border-border px-2.5 py-1 transition hover:border-accent hover:text-accent"
                      >
                        Manage
                      </Link>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/55">
                  No bills due on this date.
                </div>
              )}
            </div>
          </aside>
        </section>
      ) : (
        <div className="rounded-4xl border border-dashed border-border p-10 text-center">
          <p className="text-foreground/50">You need a household set up before viewing the calendar.</p>
        </div>
      )}
    </main>
  );
}