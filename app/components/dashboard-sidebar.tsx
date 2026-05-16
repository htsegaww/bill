import Link from "next/link";
import Image from "next/image";

import { signOut } from "@/app/dashboard/actions";

const navItems = [
  { label: "Overview", href: "/dashboard/overview" },
  { label: "Bills", href: "/dashboard/bills" },
  { label: "Spending", href: "/dashboard/spending" },
] as const;

export function DashboardSidebar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface-strong">
      <div className="mx-auto w-full max-w-7xl px-8 sm:px-10 lg:px-14">
        <div className="flex min-h-24 items-center justify-between gap-5 py-4 sm:gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-5 sm:gap-7">
            <Image src="/finovo-icon.svg" alt="Finovo logo" width={40} height={40} className="h-10 w-10" />
            <p className="shrink-0 text-lg font-semibold tracking-tight">Finovo</p>

            <nav className="min-w-0 flex-1">
              <div className="flex items-center gap-2 overflow-x-auto pr-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-foreground/70 whitespace-nowrap transition hover:border-accent hover:text-accent"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-border bg-white px-4.5 py-2 text-sm font-medium text-foreground/70 transition hover:border-foreground/35 hover:text-foreground"
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
