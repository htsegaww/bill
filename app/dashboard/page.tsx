import Link from "next/link";
import { redirect } from "next/navigation";

import { getDashboardData } from "@/lib/dashboard";

const toneClasses = {
  calm: "bg-accent-soft text-accent-strong",
  warn: "bg-signal-soft text-signal",
  danger: "bg-danger-soft text-danger",
};

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  if (dashboard.requiresAuth) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8 sm:px-10 lg:px-12">
      <header className="panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-strong px-4 py-2 text-xs uppercase tracking-[0.24em] text-foreground/55">
              {dashboard.mode === "demo" ? "Demo workspace" : "Live workspace"}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-foreground/45">
                {dashboard.householdName}
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Keep spending calm before the due dates arrive.
              </h1>
            </div>
            <p className="max-w-3xl text-base leading-7 text-foreground/70 sm:text-lg">
              {dashboard.summary}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:min-w-72">
            <div className="rounded-[1.5rem] bg-[#16372c] p-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                Active member
              </p>
              <p className="mt-3 text-lg font-semibold">{dashboard.userLabel}</p>
              <p className="mt-2 text-sm text-white/70">{dashboard.modeLabel}</p>
            </div>
            {dashboard.notice ? (
              <div className="rounded-[1.5rem] border border-border bg-surface-strong p-4 text-sm leading-6 text-foreground/70">
                {dashboard.notice}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <article key={metric.label} className="panel rounded-[1.75rem] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-foreground/48">
              {metric.label}
            </p>
            <p className="numeric mt-5 text-3xl font-medium">{metric.value}</p>
            <p className="mt-2 text-sm text-foreground/63">{metric.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
                Upcoming bills
              </p>
              <h2 className="mt-2 text-2xl font-semibold">What needs attention next</h2>
            </div>
            {dashboard.mode === "demo" ? (
              <Link
                href="/sign-in"
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
              >
                Connect Supabase
              </Link>
            ) : null}
          </div>

          <div className="mt-8 space-y-4">
            {dashboard.bills.map((bill) => (
              <article
                key={bill.id}
                className="rounded-[1.5rem] border border-border bg-surface-strong p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{bill.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${toneClasses[bill.tone]}`}
                      >
                        {bill.dueLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-foreground/60">
                      {bill.provider} · {bill.category}
                      {bill.autopay ? " · Autopay enabled" : " · Manual review"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="numeric text-2xl font-medium">{bill.amount}</p>
                    <p className="mt-1 text-sm text-foreground/55">{bill.statusLabel}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <article className="panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
              Spending mix
            </p>
            <h2 className="mt-2 text-2xl font-semibold">This month by category</h2>
            <div className="mt-8 space-y-4">
              {dashboard.categories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{category.name}</span>
                    <span className="numeric">{category.amount}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${category.share}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel rounded-[2rem] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
              Recent activity
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Latest purchases and payments</h2>
            <div className="mt-8 space-y-4">
              {dashboard.activity.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-foreground/58">{item.meta}</p>
                  </div>
                  <p className="numeric text-sm font-medium">{item.amount}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}