"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function addSpending(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) redirect("/dashboard/spending?error=no-household");

  const merchant = (formData.get("merchant") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string | null)?.trim() || null;
  const note = (formData.get("note") as string | null)?.trim() || null;
  const amountRaw = (formData.get("amount") as string | null)?.trim() ?? "";
  const spentAtRaw = (formData.get("spent_at") as string | null)?.trim() ?? "";

  if (!merchant) redirect("/dashboard/spending?error=missing-merchant");

  const amount = Number.parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) redirect("/dashboard/spending?error=invalid-amount");

  const spentAt = spentAtRaw ? new Date(`${spentAtRaw}T12:00:00.000Z`).toISOString() : new Date().toISOString();

  const { error } = await admin.from("spending_transactions").insert({
    household_id: membership.household_id,
    user_id: user.id,
    merchant,
    category,
    amount,
    spent_at: spentAt,
    note,
  });

  if (error) redirect("/dashboard/spending?error=db-error");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/spending");
  redirect("/dashboard/spending?success=added");
}

export async function deleteSpending(transactionId: string) {
  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: memberships } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id);

  const householdIds = (memberships ?? []).map((m) => m.household_id);
  if (householdIds.length === 0) redirect("/sign-in");

  const { error } = await admin
    .from("spending_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("user_id", user.id)
    .in("household_id", householdIds);

  if (error) redirect("/dashboard/spending?error=db-error");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/spending");
}
