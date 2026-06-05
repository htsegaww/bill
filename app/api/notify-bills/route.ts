import { NextRequest } from "next/server";
import { Resend } from "resend";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const NOTIFY_DAYS = [3, 7];

function buildEmailHtml(
  displayName: string,
  bills: { name: string; provider: string | null; amount_due: number | null; next_due_on: string; daysUntilDue: number }[]
): string {
  const billRows = bills
    .map(
      (b) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${b.name}${b.provider ? ` <span style="color:#6b7280;font-size:13px;">(${b.provider})</span>` : ""}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${b.amount_due != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(b.amount_due) : "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <span style="background:${b.daysUntilDue <= 3 ? "#fef2f2" : "#fffbeb"};color:${b.daysUntilDue <= 3 ? "#b91c1c" : "#92400e"};padding:2px 8px;border-radius:9999px;font-size:13px;font-weight:600;">
            ${b.daysUntilDue} day${b.daysUntilDue !== 1 ? "s" : ""}
          </span>
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:28px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Upcoming Bill Reminders</h1>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;">Hi ${displayName}, the following bills are due soon:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;font-weight:600;border-bottom:2px solid #e5e7eb;">Bill</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;border-bottom:2px solid #e5e7eb;">Amount</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;border-bottom:2px solid #e5e7eb;">Due In</th>
          </tr>
        </thead>
        <tbody>${billRows}</tbody>
      </table>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">Log in to your Bill dashboard to manage payments.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFY_FROM_EMAIL ?? "notifications@bill.app";

  if (!resendApiKey) {
    return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resend = new Resend(resendApiKey);
  const admin = createAdminSupabaseClient();

  // Compute target dates: today + 3 and today + 7
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const targetDates = NOTIFY_DAYS.map((days) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + days);
    return { date: d.toISOString().slice(0, 10), daysUntilDue: days };
  });

  const dateStrings = targetDates.map((t) => t.date);

  // Fetch active bills due on target dates
  const { data: bills, error: billsError } = await admin
    .from("bill_accounts")
    .select("id, household_id, name, provider, amount_due, next_due_on")
    .in("next_due_on", dateStrings)
    .eq("status", "active");

  if (billsError) {
    console.error("Failed to fetch bills:", billsError);
    return Response.json({ error: "Failed to fetch bills" }, { status: 500 });
  }

  if (!bills || bills.length === 0) {
    return Response.json({ sent: 0, message: "No bills due on notify dates" });
  }

  // Group bills by household
  const billsByHousehold = new Map<
    string,
    { name: string; provider: string | null; amount_due: number | null; next_due_on: string; daysUntilDue: number }[]
  >();

  for (const bill of bills) {
    const daysUntilDue = targetDates.find((t) => t.date === bill.next_due_on)?.daysUntilDue ?? 0;
    const entry = { name: bill.name, provider: bill.provider, amount_due: bill.amount_due, next_due_on: bill.next_due_on, daysUntilDue };
    const existing = billsByHousehold.get(bill.household_id) ?? [];
    existing.push(entry);
    billsByHousehold.set(bill.household_id, existing);
  }

  // Fetch member emails for all affected households
  const householdIds = Array.from(billsByHousehold.keys());
  const { data: members, error: membersError } = await admin
    .from("household_members")
    .select("household_id, profiles(email, display_name)")
    .in("household_id", householdIds);

  if (membersError) {
    console.error("Failed to fetch members:", membersError);
    return Response.json({ error: "Failed to fetch household members" }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const member of members ?? []) {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    if (!profile?.email) continue;

    const householdBills = billsByHousehold.get(member.household_id);
    if (!householdBills) continue;

    const displayName = profile.display_name ?? profile.email.split("@")[0];
    const billCount = householdBills.length;
    const subject =
      billCount === 1
        ? `Reminder: "${householdBills[0].name}" is due in ${householdBills[0].daysUntilDue} day${householdBills[0].daysUntilDue !== 1 ? "s" : ""}`
        : `Reminder: ${billCount} bills are due soon`;

    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: profile.email,
      subject,
      html: buildEmailHtml(displayName, householdBills),
    });

    if (sendError) {
      errors.push(`${profile.email}: ${sendError.message}`);
    } else {
      sent++;
    }
  }

  return Response.json({ sent, errors: errors.length > 0 ? errors : undefined });
}
