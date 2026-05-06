"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type BillStatus = "paid" | "pending" | "overdue";

async function writeBillPaymentStatus(
  billId: string,
  status: BillStatus,
  currentFilter: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  householdIds: string[]
) {
  const { data: bill, error: billError } = await supabase
    .from("bill_accounts")
    .select("id, household_id, amount_due")
    .eq("id", billId)
    .in("household_id", householdIds)
    .single();

  if (billError || !bill) redirect(`/dashboard/bills?status=${currentFilter}&error=invalid-status`);

  const mappedStatus = status === "overdue" ? "failed" : status;
  const amountDue =
    typeof bill.amount_due === "number" ? bill.amount_due : Number.parseFloat(String(bill.amount_due ?? 0));
  const amountPaid = mappedStatus === "paid" ? (Number.isFinite(amountDue) ? amountDue : 0) : 0;

  const { error } = await supabase.from("bill_payments").insert({
    household_id: bill.household_id,
    bill_account_id: bill.id,
    amount_paid: amountPaid,
    status: mappedStatus,
    note: status === "overdue" ? "Marked overdue" : null,
  });

  if (error) redirect(`/dashboard/bills?status=${currentFilter}&error=db-error`);
}

async function getUserContext() {
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
  if (householdIds.length === 0) redirect("/dashboard/bills?error=no-household");

  return { user, supabase, admin, householdIds };
}

export async function addBill(formData: FormData) {
  const { supabase, householdIds } = await getUserContext();

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const provider = (formData.get("provider") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const customCategory = (formData.get("custom_category") as string | null)?.trim() ?? "";
  const finalCategory = customCategory || category;
  const amountRaw = (formData.get("amount") as string | null)?.trim() ?? "";
  const nextDueOn = (formData.get("next_due_on") as string | null)?.trim() || null;
  const autopay = formData.get("autopay") === "on";

  if (!name) redirect("/dashboard/bills?error=missing-name");

  const amount = amountRaw ? parseFloat(amountRaw) : 0;

  const { error } = await supabase.from("bill_accounts").insert({
    household_id: householdIds[0],
    name,
    provider: provider || null,
    category: finalCategory || null,
    amount_due: amount,
    next_due_on: nextDueOn,
    autopay,
    status: "active",
  });

  if (error) redirect("/dashboard/bills?error=db-error");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect("/dashboard/bills?success=added");
}

export async function updateBill(formData: FormData) {
  const { supabase, householdIds } = await getUserContext();

  const billId = (formData.get("bill_id") as string | null)?.trim() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const provider = (formData.get("provider") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const customCategory = (formData.get("custom_category") as string | null)?.trim() ?? "";
  const finalCategory = customCategory || category;
  const amountRaw = (formData.get("amount") as string | null)?.trim() ?? "";
  const nextDueOn = (formData.get("next_due_on") as string | null)?.trim() || null;
  const autopay = formData.get("autopay") === "on";
  const currentFilter = (formData.get("current_filter") as string | null)?.trim() ?? "all";

  if (!billId || !name) redirect("/dashboard/bills?error=invalid-update");

  const amount = amountRaw ? Number.parseFloat(amountRaw) : 0;
  if (!Number.isFinite(amount) || amount < 0) redirect("/dashboard/bills?error=invalid-update");

  const { error } = await supabase
    .from("bill_accounts")
    .update({
      name,
      provider: provider || null,
      category: finalCategory || null,
      amount_due: amount,
      next_due_on: nextDueOn,
      autopay,
    })
    .eq("id", billId)
    .in("household_id", householdIds);

  if (error) redirect(`/dashboard/bills?status=${currentFilter}&error=db-error`);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(`/dashboard/bills?status=${currentFilter}&success=updated`);
}

export async function updateBillStatus(formData: FormData) {
  const { supabase, householdIds } = await getUserContext();

  const billId = (formData.get("bill_id") as string | null)?.trim() ?? "";
  const status = ((formData.get("bill_status") as string | null)?.trim() ?? "pending") as BillStatus;
  const currentFilter = (formData.get("current_filter") as string | null)?.trim() ?? "all";

  if (!billId || !["paid", "pending", "overdue"].includes(status)) {
    redirect(`/dashboard/bills?status=${currentFilter}&error=invalid-status`);
  }

  await writeBillPaymentStatus(billId, status, currentFilter, supabase, householdIds);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(`/dashboard/bills?status=${currentFilter}&success=status-updated`);
}

export async function toggleBillPaid(formData: FormData) {
  const { supabase, householdIds } = await getUserContext();

  const billId = (formData.get("bill_id") as string | null)?.trim() ?? "";
  const currentFilter = (formData.get("current_filter") as string | null)?.trim() ?? "all";
  const paid = formData.get("paid") === "on";

  if (!billId) {
    redirect(`/dashboard/bills?status=${currentFilter}&error=invalid-status`);
  }

  await writeBillPaymentStatus(billId, paid ? "paid" : "pending", currentFilter, supabase, householdIds);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
  redirect(`/dashboard/bills?status=${currentFilter}&success=status-updated`);
}

export async function deleteBill(billId: string) {
  const { supabase, householdIds } = await getUserContext();

  const { error } = await supabase
    .from("bill_accounts")
    .delete()
    .eq("id", billId)
    .in("household_id", householdIds);

  if (error) redirect("/dashboard/bills?error=db-error");

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bills");
}
