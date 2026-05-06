import Link from "next/link";

import { getDemoDashboardData } from "@/lib/dashboard";

export default function Home() {
  const demo = getDemoDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-16 pt-6 sm:px-10 lg:px-12">
      <header className="panel sticky top-6 z-20 flex items-center justify-between rounded-full px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold uppercase tracking-[0.24em] text-white">
            LB
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-foreground/55">
              Bill intelligence
            </p>
            <p className="text-lg font-semibold">Lattice Bills</p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-foreground/70 md:flex">
          <a href="#features">Features</a>
          <a href="#preview">Preview</a>
          <a href="#readiness">Production</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:bg-accent"
          >
            Open dashboard
          </Link>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-strong px-4 py-2 text-xs uppercase tracking-[0.24em] text-foreground/60">
            Multi-user finance workspace
          </div>
          <div className="space-y-6">
            <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              Track every bill, every due date, and every shared expense.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-foreground/72 sm:text-xl">
              Lattice Bills gives households and finance teams one place to manage
              recurring bills, monitor spending velocity, and share ownership with
              secure Supabase auth and row-level access controls.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              Explore the dashboard
            </Link>
            <Link
              href="/sign-in"
              className="rounded-full border border-border bg-surface-strong px-6 py-3 text-center text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              Start with Supabase auth
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {demo.metrics.map((metric) => (
              <article key={metric.label} className="panel rounded-3xl p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/50">
                  {metric.label}
                </p>
                <p className="numeric mt-4 text-3xl font-medium">{metric.value}</p>
                <p className="mt-2 text-sm text-foreground/60">{metric.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div id="preview" className="panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.22),transparent_65%)]" />
          <div className="relative space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/55">
                  Live workspace preview
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Shared household overview</h2>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
                Preview data
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {demo.bills.slice(0, 4).map((bill) => (
                <article key={bill.id} className="rounded-3xl border border-border bg-surface-strong p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{bill.name}</p>
                      <p className="mt-1 text-sm text-foreground/58">{bill.provider}</p>
                    </div>
                    <span className="rounded-full bg-signal-soft px-3 py-1 text-xs font-medium text-signal">
                      Due {bill.dueLabel}
                    </span>
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <p className="numeric text-2xl font-medium">{bill.amount}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-foreground/45">
                      {bill.category}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-[1.75rem] border border-border bg-[#16372c] p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    Smart insight
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    Dining spend is trending 18% above last month.
                  </p>
                </div>
                <p className="numeric text-2xl font-medium">$184</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="grid gap-4 py-8 lg:grid-cols-3">
        {[
          {
            title: "Shared workspaces",
            body:
              "Invite multiple users, assign roles, and scope every record with Supabase row-level security.",
          },
          {
            title: "Bill-first planning",
            body:
              "Track recurring obligations, autopay coverage, and upcoming due dates in a single dashboard.",
          },
          {
            title: "Production foundation",
            body:
              "SSR-safe Supabase clients, auth callback handling, and a schema designed for household-level ownership.",
          },
        ].map((feature) => (
          <article key={feature.title} className="panel rounded-[1.75rem] p-6">
            <p className="text-sm uppercase tracking-[0.22em] text-foreground/45">Why it scales</p>
            <h3 className="mt-4 text-2xl font-semibold">{feature.title}</h3>
            <p className="mt-4 text-base leading-7 text-foreground/68">{feature.body}</p>
          </article>
        ))}
      </section>

      <section id="readiness" className="panel mt-8 rounded-[2rem] p-8 sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/50">
              Production readiness
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              Built to move from demo mode to authenticated teams.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Supabase magic link auth with callback exchange",
              "Request-time session refresh using Next 16 proxy.ts",
              "SQL schema with household memberships and RLS policies",
              "Server-rendered dashboard with graceful demo fallback",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border bg-surface-strong px-5 py-4 text-sm leading-6 text-foreground/72">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
