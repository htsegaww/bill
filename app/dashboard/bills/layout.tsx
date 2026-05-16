import { BillsSubnav } from "@/app/components/bills-subnav";

export default function BillsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="mx-auto w-full max-w-4xl px-6 pt-6 sm:px-10">
        <BillsSubnav />
      </div>
      {children}
    </div>
  );
}