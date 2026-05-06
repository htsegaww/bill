import Link from "next/link";

import { isSupabaseConfigured } from "@/lib/env";

import { requestMagicLink } from "./actions";

const messages = {
  sent: "A magic link has been sent. Open it on this device to finish signing in.",
  error: "Supabase could not send the magic link. Check your project settings and email auth provider.",
  "missing-email": "Enter an email address to continue.",
  "missing-config": "Supabase environment variables are missing. Add them before testing auth.",
} as const;

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const message = status ? messages[status as keyof typeof messages] : null;
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-10 sm:px-10 lg:px-12">
      <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel rounded-[2rem] p-8 sm:p-10">
          <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
            Authenticated workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Sign in with a secure Supabase magic link.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-foreground/70">
            This starter uses Supabase Auth for multi-user access, request-time session refresh,
            and a dashboard that can scope bills to households or teams with row-level security.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Email-link auth without password handling",
              "SSR-safe cookie management for App Router routes",
              "RLS-ready schema for households, bills, and spending",
              "Graceful demo mode before environment setup is complete",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-border bg-surface-strong px-5 py-4 text-sm leading-6 text-foreground/68">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-[2rem] p-8 sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
                Login
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Continue to Lattice Bills</h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                configured ? "bg-accent-soft text-accent-strong" : "bg-signal-soft text-signal"
              }`}
            >
              {configured ? "Supabase connected" : "Setup required"}
            </span>
          </div>

          {message ? (
            <div className="mt-6 rounded-[1.25rem] border border-border bg-surface-strong px-4 py-3 text-sm leading-6 text-foreground/68">
              {message}
            </div>
          ) : null}

          <form action={requestMagicLink} className="mt-8 space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Work email</span>
              <input
                type="email"
                name="email"
                placeholder="you@team.com"
                className="w-full rounded-[1.25rem] border border-border bg-surface-strong px-4 py-4 text-base outline-none transition placeholder:text-foreground/35 focus:border-accent"
                required
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent"
            >
              Send magic link
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-sm text-foreground/60">
            <Link href="/" className="font-medium transition hover:text-accent">
              Back to landing page
            </Link>
            <Link href="/dashboard" className="font-medium transition hover:text-accent">
              View demo dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}