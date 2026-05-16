import Link from "next/link";

import { signOut } from "@/app/dashboard/actions";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Bills", href: "/dashboard/bills" },
  { label: "Spending", href: "/dashboard/spending" },
] as const;

type Props = {
  userEmail: string | null;
};

export function DashboardSidebar({ userEmail }: Props) {
  return (
    <header className="z-20 w-full border-b border-border bg-surface-strong/95">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
              <span className="text-xs font-semibold">LB</span>
            </div>
            <p className="shrink-0 text-base font-semibold tracking-tight">Lattice Bills</p>

            <nav className="min-w-0 flex-1">
              <div className="flex items-center gap-2 overflow-x-auto">
                {navItems.map((item) => {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground/62 transition-colors hover:bg-surface-muted hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {userEmail ? (
              <span className="hidden max-w-56 truncate text-xs text-foreground/45 lg:inline-block">
                {userEmail}
              </span>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground/70 transition hover:border-foreground/35 hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
