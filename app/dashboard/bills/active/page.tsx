import { redirect } from "next/navigation";

import { deleteBill, toggleBillPaid, updateBill } from "@/app/dashboard/bills/actions";
import {
  formatAmount,
  formatDate,
  getActiveBillsData,
  getDueTone,
  getValidStatusFilter,
  type StatusFilter,
} from "@/app/dashboard/bills/data";

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

export default async function ActiveBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; status?: string }>;
}) {
  const params = await searchParams;
  const currentFilter: StatusFilter = getValidStatusFilter(params.status);
  const { configured, hasHousehold, billRows } = await getActiveBillsData();

  if (!configured) {
    redirect("/dashboard/bills/add");
  }

  const errorKey = params.error;
  const success = params.success;
  const filteredRows =
    currentFilter === "all"
      ? billRows
      : billRows.filter((row) => row.displayStatus === currentFilter);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">Active bills</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Your active bills</h1>
        <p className="mt-2 text-base text-foreground/65">Review what is currently active, due, or overdue.</p>
      </header>

      {success === "status-updated" && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Bill status updated.
        </div>
      )}
      {success === "updated" && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Bill updated successfully.
        </div>
      )}
      {errorKey === "no-household" && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger">
          No household found. Please sign out and sign back in.
        </div>
      )}

      {billRows.length > 0 ? (
        <section className="panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">Bills list</p>
              <h2 className="mt-2 text-xl font-semibold">Active bills</h2>
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
                <div key={bill.id} className="rounded-[1.5rem] border border-border bg-surface-strong p-5">
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
                        <form action={async () => {
                          "use server";
                          await deleteBill(bill.id);
                        }}>
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
                        <input
                          type="text"
                          name="category"
                          defaultValue={bill.category ?? ""}
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
      ) : hasHousehold ? (
        <div className="rounded-[2rem] border border-dashed border-border p-10 text-center">
          <p className="text-foreground/50">No active bills yet.</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border p-10 text-center">
          <p className="text-foreground/50">You need a household set up before viewing active bills.</p>
        </div>
      )}
    </main>
  );
}