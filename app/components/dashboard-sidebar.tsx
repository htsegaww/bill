"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/dashboard/actions";

const navItems = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10.5" y="1" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="10.5" y="10.5" width="6.5" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    exact: true,
  },
  {
    label: "Bills",
    href: "/dashboard/bills",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 7h7M5.5 10h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    exact: false,
  },
  {
    label: "Spending",
    href: "/dashboard/spending",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M2 13l4-4 3 3 4.5-6 2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    exact: false,
  },
] as const;

type Props = {
  userEmail: string | null;
};

export function DashboardSidebar({ userEmail }: Props) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="sticky top-0 flex h-screen min-h-screen w-64 shrink-0 flex-col border-r border-border bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(244,236,223,0.9))]">
      {/* Logo */}
      <div className="border-b border-border/80 px-5 py-7">
        <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1.5C4 1.5 1.5 4 1.5 7S4 12.5 7 12.5 12.5 10 12.5 7 10 1.5 7 1.5Z" stroke="white" strokeWidth="1.4" />
            <path d="M7 4.5v3l2 1.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight">Lattice Bills</span>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-foreground/45">Control center</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-5">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "text-foreground/65 hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              <span className={active ? "text-white" : "text-foreground/45"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-border/80 px-3 py-5">
        {userEmail && (
          <p className="truncate px-3 pb-3 text-xs text-foreground/45">{userEmail}</p>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground/65 transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-foreground/45">
              <path d="M7 3H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h4M12 12.5l3.5-3.5L12 5.5M6 9h9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
