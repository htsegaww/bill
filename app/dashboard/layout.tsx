import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/app/components/dashboard-sidebar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userEmail: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/sign-in");
    }

    userEmail = user.email ?? null;
  }

  return (
    <div className="flex h-full min-h-screen">
      <DashboardSidebar userEmail={userEmail} />
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
