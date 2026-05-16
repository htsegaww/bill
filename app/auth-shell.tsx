import Link from "next/link";

import { AuthSubmitButton } from "@/app/components/auth-submit-button";

type AuthMode = "sign-in" | "sign-up";

type AuthShellProps = {
  mode: AuthMode;
  configured: boolean;
  message: string | null;
  action: (formData: FormData) => Promise<void>;
};

const copy = {
  "sign-in": {
    heading: "Welcome back",
    sub: "Sign in with your email and password.",
    cta: "Sign in",
    placeholder: "you@household.com",
    switchText: "Don't have an account?",
    switchHref: "/sign-up",
    switchLabel: "Create one",
  },
  "sign-up": {
    heading: "Create your account",
    sub: "Set up your workspace in seconds. Minimum 8 character password.",
    cta: "Create account",
    placeholder: "you@team.com",
    switchText: "Already have an account?",
    switchHref: "/sign-in",
    switchLabel: "Sign in",
  },
} as const;

export function AuthShell({ mode, configured, message, action }: AuthShellProps) {
  const c = copy[mode];
  // Success states no longer used since we redirect directly on success
  const isSuccess = false;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-accent opacity-[0.1] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-signal opacity-[0.11] blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground opacity-[0.04] blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] sm:max-w-[460px]">
        {/* Logo */}
        <Link href="/" className="mb-10 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_8px_22px_rgba(11,132,243,0.38)]">
            LB
          </div>
          <span className="text-xl font-semibold tracking-[-0.04em]">Lattice Bills</span>
        </Link>

        {/* Card */}
        <div className="panel overflow-hidden rounded-[2rem] border-border/80 shadow-[0_22px_56px_rgba(14,29,49,0.16)]">
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            <Link
              href="/sign-in"
              className={`flex-1 py-4 text-center text-sm font-medium transition ${
                mode === "sign-in"
                  ? "border-b-2 border-accent text-accent"
                  : "text-foreground/50 hover:text-foreground/75"
              }`}
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className={`flex-1 py-4 text-center text-sm font-medium transition ${
                mode === "sign-up"
                  ? "border-b-2 border-accent text-accent"
                  : "text-foreground/50 hover:text-foreground/75"
              }`}
            >
              Create account
            </Link>
          </div>

          <div className="p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.04em]">{c.heading}</h1>
            <p className="mt-2 text-sm leading-6 text-foreground/58">{c.sub}</p>

            {/* Feedback message */}
            {message ? (
              <div
                className={`mt-5 rounded-[1rem] border px-4 py-3 text-sm leading-6 ${
                  isSuccess
                    ? "border-accent/20 bg-accent-soft text-accent-strong"
                    : "border-danger/20 bg-danger-soft text-danger"
                }`}
              >
                {message}
              </div>
            ) : null}

            {/* Supabase not configured warning */}
            {!configured ? (
              <div className="mt-5 rounded-[1rem] border border-signal/30 bg-signal-soft px-4 py-3 text-sm leading-6 text-signal">
                Add{" "}
                <code className="rounded bg-signal/10 px-1 font-mono text-xs">
                  NEXT_PUBLIC_SUPABASE_URL
                </code>{" "}
                and{" "}
                <code className="rounded bg-signal/10 px-1 font-mono text-xs">
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>{" "}
                to your{" "}
                <code className="rounded bg-signal/10 px-1 font-mono text-xs">.env.local</code>{" "}
                to enable auth.
              </div>
            ) : null}

            <form action={action} className="mt-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground/72">Email address</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder={c.placeholder}
                  className="w-full rounded-[1.1rem] border border-border bg-surface-strong px-4 py-3.5 text-base outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground/72">Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full rounded-[1.1rem] border border-border bg-surface-strong px-4 py-3.5 text-base outline-none transition placeholder:text-foreground/30 hover:border-foreground/22 focus:border-accent focus:ring-2 focus:ring-accent/12"
                  required
                />
              </label>

              <AuthSubmitButton>{c.cta}</AuthSubmitButton>
            </form>

            <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
              <div className={`h-2 w-2 rounded-full ${configured ? "bg-accent" : "bg-signal"}`} />
              <p className="text-xs text-foreground/50">
                {configured ? "Supabase connected · Email & password auth" : "Supabase not configured"}
              </p>
            </div>
          </div>
        </div>

        {/* Footer toggle */}
        <p className="mt-6 text-center text-sm text-foreground/52">
          {c.switchText}{" "}
          <Link href={c.switchHref} className="font-semibold text-foreground/80 transition hover:text-accent">
            {c.switchLabel}
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-foreground/38">
          <Link href="/dashboard" className="transition hover:text-accent/70">
            Skip to demo dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}