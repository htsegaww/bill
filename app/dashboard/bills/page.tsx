import { redirect } from "next/navigation";

import { AuthSubmitButton } from "@/app/components/auth-submit-button";
import { addBill, deleteBill, toggleBillPaid, updateBill } from "@/app/dashboard/bills/actions";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const CATEGORIES = [
  "Housing",
  "Utilities",
  "Insurance",
  "Subscriptions",
  "Transportation",
  "Internet & Phone",
  "Groceries",
  "Education",
  "Childcare",
  "Taxes",
  "Health",
  "Debt",
  "Entertainment",
  "Other",
];

const toneClasses = {
  calm: "bg-accent-soft text-accent-strong",
  warn: "bg-signal-soft text-signal",
  danger: "bg-danger-soft text-danger",
};

const statusToneClasses = {
  paid: "bg-accent-soft text-accent-strong",
  pending: "bg-signal-soft text-signal",
  overdue: "bg-danger-soft text-danger",
};

const validFilters = ["all", "paid", "pending", "overdue"] as const;
type StatusFilter = (typeof validFilters)[number];
type DisplayStatus = "paid" | "pending" | "overdue";

const errorMessages: Record<string, string> = {
  "missing-name": "Bill name is required.",
  "no-household": "No household found. Please sign out and sign back in.",
  "invalid-status": "Could not update status. Please try again.",
  "invalid-update": "Could not save bill changes. Check your values and try again.",
  "db-error": "Something went wrong saving your bill. Please try again.",
};

type Bill = {
  id: string;
  name: string;
  provider: string | null;
  category: string | null;
  amount_due: number | string | null;
  next_due_on: string | null;
  autopay: boolean | null;
  status: string | null;
};

type PaymentRecord = {
  bill_account_id: string;
  status: string;
  created_at: string;
};

type BillWithState = {
  bill: Bill;
  displayStatus: DisplayStatus;
};

function getDueTone(nextDueOn: string | null): "calm" | "warn" | "danger" {
  if (!nextDueOn) return "calm";
  const today = new Date();
  const due = new Date(nextDueOn);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "danger";
  if (diffDays <= 7) return "warn";
  return "calm";
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(dateStr + "T12:00:00")
  );
}

function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    typeof amount === "string" ? parseFloat(amount) : amount
  );
}

function deriveBillStatus(
  nextDueOn: string | null,
  latestPaymentStatus: string | undefined
): DisplayStatus {
  if (latestPaymentStatus === "paid") return "paid";
  if (latestPaymentStatus === "pending") return "pending";
  if (latestPaymentStatus === "failed") return "overdue";

  if (!nextDueOn) return "pending";
  const now = new Date();
  const due = new Date(`${nextDueOn}T12:00:00`);
  return due < now ? "overdue" : "pending";
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; status?: string }>;
}) {
  const params = await searchParams;
  const errorKey = params.error;
  const success = params.success;
  const currentFilter: StatusFilter = validFilters.includes((params.status as StatusFilter) ?? "all")
    ? ((params.status as StatusFilter) ?? "all")
    : "all";

  let bills: Bill[] = [];
  let billRows: BillWithState[] = [];
  let hasHousehold = false;
  const configured = isSupabaseConfigured();

  if (configured) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/sign-in");

    // Use admin client for membership lookup so it works regardless of RLS policy state
    const admin = createAdminSupabaseClient();
    const { data: membership } = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    hasHousehold = !!membership;

    if (membership) {
      const admin = createAdminSupabaseClient();
      const { data } = await supabase
        .from("bill_accounts")
        .select("id, name, provider, category, amount_due, next_due_on, autopay, status")
        .eq("household_id", membership.household_id)
        .eq("status", "active")
        .order("next_due_on", { ascending: true, nullsFirst: false });

      bills = (data as Bill[]) ?? [];

      if (bills.length > 0) {
        const billIds = bills.map((bill) => bill.id);
        const { data: payments } = await admin
          .from("bill_payments")
          .select("bill_account_id, status, created_at")
          .in("bill_account_id", billIds)
          .order("created_at", { ascending: false });

        const latestByBill = new Map<string, PaymentRecord>();
        for (const payment of (payments as PaymentRecord[] | null) ?? []) {
          if (!latestByBill.has(payment.bill_account_id)) {
            latestByBill.set(payment.bill_account_id, payment);
          }
        }

        billRows = bills.map((bill) => ({
          bill,
          displayStatus: deriveBillStatus(bill.next_due_on, latestByBill.get(bill.id)?.status),
        }));
      }
    }
  }

  const filteredRows =
    currentFilter === "all"
      ? billRows
      : billRows.filter((row) => row.displayStatus === currentFilter);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">Bills</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Your bills</h1>
        <p className="mt-2 text-base text-foreground/65">
          Add recurring bills to track what&apos;s due and when.
        </p>
      </header>

      {/* Feedback banners */}
      {success === "added" && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Bill added successfully.
        </div>
      )}
      {success === "updated" && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Bill updated successfully.
        </div>
      )}
      {success === "status-updated" && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Bill status updated.
        </div>
      )}
      {errorKey && errorMessages[errorKey] && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger">
          {errorMessages[errorKey]}
        </div>
      )}

      {/* Add bill form */}
      <section className="panel rounded-[2rem] p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Add a bill</h2>
        <p className="mt-1 text-sm text-foreground/60">
          {!configured
            ? "Connect Supabase to save real bills."
            : !hasHousehold
              ? "You need a household set up before adding bills."
              : "Fill in what you know — you can always update details later."}
        </p>

        <form action={addBill} className="mt-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Bill name *</span>
              <input
                type="text"
                name="name"
                placeholder="e.g. Electric bill"
                required
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Provider</span>
              <input
                type="text"
                name="provider"
                placeholder="e.g. Pacific Gas & Electric"
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Category</span>
              <div className="relative">
                <select
                  name="category"
                  defaultValue=""
                  className="w-full appearance-none rounded-[1.1rem] border border-border bg-surface-strong px-4 py-3 pr-11 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
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
              <p className="text-xs text-foreground/48">Used to group spending insights on your dashboard.</p>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Add custom category</span>
              <input
                type="text"
                name="custom_category"
                placeholder="e.g. Pets"
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Amount due</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-foreground/40">
                  $
                </span>
                <input
                  type="number"
                  name="amount"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-[1.1rem] border border-border bg-white py-3 pl-8 pr-4 text-sm outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                />
              </div>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground/72">Next due date</span>
              <input
                type="date"
                name="next_due_on"
                className="w-full rounded-[1.1rem] border border-border bg-white px-4 py-3 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              />
            </label>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  name="autopay"
                  className="h-4 w-4 rounded border-border accent-accent"
                />
                <span className="text-sm font-medium text-foreground/72">Autopay enabled</span>
              </label>
            </div>
          </div>

          <div className="pt-1">
            <AuthSubmitButton>Add bill</AuthSubmitButton>
          </div>
        </form>
      </section>

      {/* Bills list */}
      {billRows.length > 0 && (
        <section className="panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Active bills</h2>
              <p className="mt-1 text-sm text-foreground/60">
                {filteredRows.length} of {billRows.length} bill{billRows.length !== 1 ? "s" : ""} shown
              </p>
            </div>
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-xs uppercase tracking-[0.18em] text-foreground/48">
                Filter
              </label>
              <select
                id="status-filter"
                name="status"
                defaultValue={currentFilter}
                className="rounded-full border border-border bg-surface-strong px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
              <button
                type="submit"
                className="rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground/70 transition hover:border-accent hover:text-accent"
              >
                Apply
              </button>
            </form>
          </div>

          <div className="mt-6 space-y-3">
            {filteredRows.map(({ bill, displayStatus }) => {
              const tone = getDueTone(bill.next_due_on);
              return (
                <div
                  key={bill.id}
                  className="rounded-[1.5rem] border border-border bg-surface-strong p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base font-semibold">{bill.name}</h3>
                        {bill.next_due_on && (
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}>
                            Due {formatDate(bill.next_due_on)}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusToneClasses[displayStatus]}`}
                        >
                          {displayStatus[0].toUpperCase() + displayStatus.slice(1)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground/58">
                        {[bill.provider, bill.category].filter(Boolean).join(" · ")}
                        {bill.autopay ? " · Autopay" : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                      <p className="numeric text-xl font-medium">{formatAmount(bill.amount_due)}</p>
                      <div className="flex items-center gap-2">
                        <form action={toggleBillPaid} className="flex items-center gap-2">
                          <input type="hidden" name="bill_id" value={bill.id} />
                          <input type="hidden" name="current_filter" value={currentFilter} />
                          <label className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs text-foreground/70">
                            <input
                              type="checkbox"
                              name="paid"
                              defaultChecked={displayStatus === "paid"}
                              className="h-3.5 w-3.5 rounded border-border accent-accent"
                            />
                            Paid
                          </label>
                          <button
                            type="submit"
                            className="ml-2 rounded-full border border-border px-3 py-1.5 text-xs text-foreground/60 transition hover:border-accent hover:text-accent"
                          >
                            Save
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await deleteBill(bill.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground/45 transition hover:border-danger/30 hover:text-danger"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  <details className="mt-4 rounded-2xl border border-border/80 bg-white/55 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground/70">Edit bill</summary>
                    <form action={updateBill} className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="bill_id" value={bill.id} />
                      <input type="hidden" name="current_filter" value={currentFilter} />

                      <label className="block space-y-1.5 sm:col-span-2">
                        <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">Bill name</span>
                        <input
                          type="text"
                          name="name"
                          defaultValue={bill.name}
                          required
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">Provider</span>
                        <input
                          type="text"
                          name="provider"
                          defaultValue={bill.provider ?? ""}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">Amount due</span>
                        <input
                          type="number"
                          name="amount"
                          min="0"
                          step="0.01"
                          defaultValue={typeof bill.amount_due === "number" ? bill.amount_due : Number(bill.amount_due ?? 0)}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">Category</span>
                        <select
                          name="category"
                          defaultValue={CATEGORIES.includes(bill.category ?? "") ? (bill.category ?? "") : ""}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                        >
                          <option value="">Select a category</option>
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">Custom category</span>
                        <input
                          type="text"
                          name="custom_category"
                          defaultValue={CATEGORIES.includes(bill.category ?? "") ? "" : (bill.category ?? "")}
                          placeholder="Optional"
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs uppercase tracking-[0.16em] text-foreground/45">Next due date</span>
                        <input
                          type="date"
                          name="next_due_on"
                          defaultValue={bill.next_due_on ?? ""}
                          className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                        />
                      </label>

                      <label className="mt-1 flex items-center gap-2 sm:col-span-2">
                        <input
                          type="checkbox"
                          name="autopay"
                          defaultChecked={!!bill.autopay}
                          className="h-4 w-4 rounded border-border accent-accent"
                        />
                        <span className="text-sm text-foreground/70">Autopay enabled</span>
                      </label>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
                        >
                          Save changes
                        </button>
                      </div>
                    </form>
                  </details>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {billRows.length === 0 && configured && hasHousehold && (
        <div className="rounded-[2rem] border border-dashed border-border p-10 text-center">
          <p className="text-foreground/50">No bills yet — add your first one above.</p>
        </div>
      )}

      {billRows.length > 0 && filteredRows.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-border p-10 text-center">
          <p className="text-foreground/50">No bills match this status filter.</p>
        </div>
      )}
    </main>
  );
}
