import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

const validFilters = ["all", "paid", "pending", "overdue"] as const;

export type StatusFilter = (typeof validFilters)[number];
export type DisplayStatus = "paid" | "pending" | "overdue";

export type Bill = {
  id: string;
  name: string;
  provider: string | null;
  category: string | null;
  amount_due: number | string | null;
  next_due_on: string | null;
  autopay: boolean | null;
  status: string | null;
};

type PaymentRecord = {
  bill_account_id: string;
  status: string;
  created_at: string;
};

export type BillWithState = {
  bill: Bill;
  displayStatus: DisplayStatus;
};

export function getValidStatusFilter(value: string | null | undefined): StatusFilter {
  return validFilters.includes((value as StatusFilter) ?? "all") ? ((value as StatusFilter) ?? "all") : "all";
}

export function getDueTone(nextDueOn: string | null): "calm" | "warn" | "danger" {
  if (!nextDueOn) return "calm";
  const today = new Date();
  const due = new Date(nextDueOn);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "danger";
  if (diffDays <= 7) return "warn";
  return "calm";
}

export function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(dateStr + "T12:00:00")
  );
}

export function formatAmount(amount: number | string | null) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    typeof amount === "string" ? parseFloat(amount) : amount
  );
}

function deriveBillStatus(nextDueOn: string | null, latestPaymentStatus: string | undefined): DisplayStatus {
  if (latestPaymentStatus === "paid") return "paid";
  if (latestPaymentStatus === "pending") return "pending";
  if (latestPaymentStatus === "failed") return "overdue";

  if (!nextDueOn) return "pending";
  const now = new Date();
  const due = new Date(`${nextDueOn}T12:00:00`);
  return due < now ? "overdue" : "pending";
}

async function getUserContext() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return {
      configured,
      hasHousehold: false,
      supabase: null,
      admin: null,
      householdId: null,
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return {
    configured,
    hasHousehold: !!membership,
    supabase,
    admin,
    householdId: membership?.household_id ?? null,
  };
}

export async function getBillsAccessState() {
  const { configured, hasHousehold } = await getUserContext();
  return { configured, hasHousehold };
}

export async function getActiveBillsData() {
  const { configured, hasHousehold, supabase, admin, householdId } = await getUserContext();

  if (!configured || !hasHousehold || !supabase || !admin || !householdId) {
    return { configured, hasHousehold, billRows: [] as BillWithState[] };
  }

  const { data } = await supabase
    .from("bill_accounts")
    .select("id, name, provider, category, amount_due, next_due_on, autopay, status")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("next_due_on", { ascending: true, nullsFirst: false });

  const bills = (data as Bill[]) ?? [];

  if (bills.length === 0) {
    return { configured, hasHousehold, billRows: [] as BillWithState[] };
  }

  const billIds = bills.map((bill) => bill.id);
  const { data: payments } = await admin
    .from("bill_payments")
    .select("bill_account_id, status, created_at")
    .in("bill_account_id", billIds)
    .order("created_at", { ascending: false });

  const latestByBill = new Map<string, PaymentRecord>();
  for (const payment of (payments as PaymentRecord[] | null) ?? []) {
    if (!latestByBill.has(payment.bill_account_id)) {
      latestByBill.set(payment.bill_account_id, payment);
    }
  }

  return {
    configured,
    hasHousehold,
    billRows: bills.map((bill) => ({
      bill,
      displayStatus: deriveBillStatus(bill.next_due_on, latestByBill.get(bill.id)?.status),
    })),
  };
}