import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/app/components/dashboard-sidebar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/sign-in");
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col pt-6 sm:pt-8">{children}</div>
    </div>
  );
}
