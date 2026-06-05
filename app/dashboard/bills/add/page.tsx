import { AuthSubmitButton } from "@/app/components/auth-submit-button";
import { addBill } from "@/app/dashboard/bills/actions";
import { getBillsAccessState } from "@/app/dashboard/bills/data";

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

const errorMessages: Record<string, string> = {
  "missing-name": "Bill name is required.",
  "no-household": "No household found. Please sign out and sign back in.",
  "db-error": "Something went wrong saving your bill. Please try again.",
};

export default async function AddBillPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const errorKey = params.error;
  const success = params.success;
  const { configured, hasHousehold } = await getBillsAccessState();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-8 sm:gap-12 sm:px-10">
      <header>
        <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">Bills</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Add a bill</h1>
        <p className="mt-2 text-base text-foreground/65">
          Create a recurring bill so it can appear on the active bills screen.
        </p>
      </header>

      {success === "added" && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4 text-sm text-accent-strong">
          Bill added successfully.
        </div>
      )}
      {errorKey && errorMessages[errorKey] && (
        <div className="rounded-2xl border border-danger/20 bg-danger-soft px-5 py-4 text-sm text-danger">
          {errorMessages[errorKey]}
        </div>
      )}

      <section className="panel rounded-4xl p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-foreground/45">Add bills</p>
            <h2 className="mt-2 text-xl font-semibold">Add a bill</h2>
          </div>
        </div>

        <p className="text-sm text-foreground/60">
          {!configured
            ? "Connect Supabase to save real bills."
            : !hasHousehold
              ? "You need a household set up before adding bills."
              : "Fill in what you know - you can always update details later."}
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
                <input type="checkbox" name="autopay" className="h-4 w-4 rounded border-border accent-accent" />
                <span className="text-sm font-medium text-foreground/72">Autopay enabled</span>
              </label>
            </div>
          </div>

          <div className="pt-1">
            <AuthSubmitButton>Add bill</AuthSubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
}
