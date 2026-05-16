"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Add bill", href: "/dashboard/bills/add" },
  { label: "Active bills", href: "/dashboard/bills/active" },
] as const;

export function BillsSubnav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-[1.75rem] border border-border bg-surface-strong p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={pathname === tab.href ? "page" : undefined}
            className={[
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              pathname === tab.href
                ? "border-accent bg-accent-soft text-accent-strong"
                : "border-border bg-white text-foreground/70 hover:border-accent hover:text-accent",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}