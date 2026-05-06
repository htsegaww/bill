import Link from "next/link";

type AuthMode = "sign-in" | "sign-up";

type AuthShellProps = {
  mode: AuthMode;
  configured: boolean;
  message: string | null;
  action: (formData: FormData) => Promise<void>;
};

const authCopy = {
  "sign-in": {
    eyebrow: "Member login",
    title: "Return to a calmer bill flow.",
    description:
      "Open your workspace with a secure email link and pick up where your household or finance team left off.",
    cta: "Send sign-in link",
    altLabel: "New here?",
    altHref: "/sign-up",
    altText: "Create your workspace",
    heroTag: "Live spend visibility",
    spotlightTitle: "This week at a glance",
    spotlightBody:
      "See upcoming due dates, autopay coverage, and recent household activity without digging through statements.",
    status: "Returning member",
  },
  "sign-up": {
    eyebrow: "Create account",
    title: "Launch a beautiful finance workspace.",
    description:
      "Start with passwordless onboarding, then grow into household memberships, shared bills, and production-ready access control.",
    cta: "Send sign-up link",
    altLabel: "Already have access?",
    altHref: "/sign-in",
    altText: "Sign in instead",
    heroTag: "Shared household setup",
    spotlightTitle: "What you unlock",
    spotlightBody:
      "Spin up a workspace for rent, utilities, groceries, subscriptions, and shared spending with Supabase-backed multi-user auth.",
    status: "New workspace",
  },
} as const;

export function AuthShell({ mode, configured, message, action }: AuthShellProps) {
  const copy = authCopy[mode];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 py-8 sm:px-10 lg:px-12">
      <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="panel relative overflow-hidden rounded-[2rem] p-8 sm:p-10 lg:min-h-[44rem]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.2),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="inline-flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#16372c] text-sm font-semibold uppercase tracking-[0.24em] text-white">
                    LB
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
                      Lattice Bills
                    </p>
                    <p className="text-sm text-foreground/70">Bill management system</p>
                  </div>
                </Link>
                <span className="rounded-full border border-border bg-surface-strong px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-foreground/55">
                  {copy.status}
                </span>
              </div>

              <div className="mt-12 max-w-2xl space-y-6">
                <p className="text-xs uppercase tracking-[0.28em] text-foreground/45">
                  {copy.heroTag}
                </p>
                <h1 className="text-balance text-5xl font-semibold leading-[0.95] tracking-[-0.06em] sm:text-6xl">
                  {copy.title}
                </h1>
                <p className="max-w-xl text-lg leading-8 text-foreground/68">
                  {copy.description}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[1.75rem] bg-[#16372c] p-6 text-white shadow-[0_24px_60px_rgba(22,55,44,0.25)]">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  {copy.spotlightTitle}
                </p>
                <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  {copy.spotlightBody}
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Due this week", value: "$3.2k" },
                    { label: "Autopay coverage", value: "62%" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/50">{item.label}</p>
                      <p className="numeric mt-3 text-2xl font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </article>

              <div className="grid gap-4">
                {[
                  "Invite multiple members into the same household workspace.",
                  "Track bills, payments, and discretionary spending in one place.",
                  "Keep auth, session refresh, and RLS aligned with production needs.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-border bg-surface-strong px-5 py-4 text-sm leading-6 text-foreground/70"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="panel relative overflow-hidden rounded-[2rem] p-8 sm:p-10 lg:min-h-[44rem]">
          <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(15,118,110,0.14),transparent)]" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-foreground/45">
                {copy.eyebrow}
              </p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
                {mode === "sign-in" ? "Continue to your dashboard" : "Start your workspace"}
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-foreground/66">
                {mode === "sign-in"
                  ? "We use passwordless email links so members can move between devices without managing credentials."
                  : "Use your email to create a new account. Supabase will issue a secure magic link and create the user on first verification."}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-border bg-surface-strong px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/45">Connection</p>
                  <p className="mt-1 text-sm font-medium text-foreground/75">
                    {configured ? "Supabase connected" : "Supabase setup required"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    configured ? "bg-accent-soft text-accent-strong" : "bg-signal-soft text-signal"
                  }`}
                >
                  {configured ? "Ready" : "Pending"}
                </span>
              </div>

              {message ? (
                <div className="rounded-[1.25rem] border border-border bg-surface-strong px-4 py-3 text-sm leading-6 text-foreground/68">
                  {message}
                </div>
              ) : null}

              <form action={action} className="space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground/72">Email address</span>
                  <input
                    type="email"
                    name="email"
                    placeholder={mode === "sign-in" ? "you@household.com" : "founder@team.com"}
                    className="w-full rounded-[1.4rem] border border-border bg-[#fffaf3] px-4 py-4 text-base outline-none transition placeholder:text-foreground/35 focus:border-accent"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="w-full rounded-full bg-[#16372c] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent"
                >
                  {copy.cta}
                </button>
              </form>

              <div className="grid gap-3 rounded-[1.5rem] border border-border bg-surface-strong p-4 text-sm leading-6 text-foreground/64 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/42">Auth</p>
                  <p className="mt-1">Magic-link login</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/42">Sessions</p>
                  <p className="mt-1">SSR cookie refresh</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-foreground/42">Access</p>
                  <p className="mt-1">Household-scoped RLS</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border/80 pt-6 text-sm text-foreground/60">
              <Link href="/dashboard" className="font-medium transition hover:text-accent">
                Preview the dashboard
              </Link>
              <p>
                {copy.altLabel}{" "}
                <Link href={copy.altHref} className="font-semibold text-foreground transition hover:text-accent">
                  {copy.altText}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}