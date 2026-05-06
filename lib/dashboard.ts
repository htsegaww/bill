import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Metric = {
  label: string;
  value: string;
  description: string;
};

type BillTone = "calm" | "warn" | "danger";

type BillCard = {
  id: string;
  name: string;
  provider: string;
  category: string;
  amount: string;
  dueLabel: string;
  statusLabel: string;
  tone: BillTone;
  autopay: boolean;
};

type CategoryCard = {
  name: string;
  amount: string;
  share: number;
};

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  amount: string;
};

export type DashboardResult = {
  requiresAuth: boolean;
  mode: "demo" | "live";
  modeLabel: string;
  householdName: string;
  userLabel: string;
  summary: string;
  notice: string | null;
  metrics: Metric[];
  bills: BillCard[];
  categories: CategoryCard[];
  activity: ActivityItem[];
};

type BillRecord = {
  id: string;
  name: string;
  provider: string | null;
  category: string | null;
  amount_due: number | string | null;
  next_due_on: string | null;
  autopay: boolean | null;
  status: string | null;
};

type TransactionRecord = {
  id: string;
  merchant: string;
  category: string | null;
  amount: number | string;
  spent_at: string;
  note: string | null;
};

type MembershipRecord = {
  role: string;
  households:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const dayDistance = (dateValue: string | null) => {
  if (!dateValue) {
    return Number.POSITIVE_INFINITY;
  }

  const dueDate = new Date(dateValue);
  const now = new Date();
  dueDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return Math.round((dueDate.getTime() - now.getTime()) / 86_400_000);
};

const buildTone = (distance: number): BillTone => {
  if (distance < 0) {
    return "danger";
  }

  if (distance <= 3) {
    return "warn";
  }

  return "calm";
};

const buildDueLabel = (dateValue: string | null) => {
  if (!dateValue) {
    return "No due date";
  }

  const distance = dayDistance(dateValue);

  if (distance < 0) {
    return `${Math.abs(distance)}d overdue`;
  }

  if (distance === 0) {
    return "Due today";
  }

  if (distance === 1) {
    return "Due tomorrow";
  }

  return `Due ${dayFormatter.format(new Date(dateValue))}`;
};

const demoBills: BillCard[] = [
  {
    id: "bill-1",
    name: "Apartment Rent",
    provider: "North Harbor Properties",
    category: "Housing",
    amount: currency.format(2450),
    dueLabel: "Due May 9",
    statusLabel: "Autopay armed",
    tone: "warn",
    autopay: true,
  },
  {
    id: "bill-2",
    name: "Electricity",
    provider: "GridOne Energy",
    category: "Utilities",
    amount: currency.format(186),
    dueLabel: "Due tomorrow",
    statusLabel: "Usage +12% week over week",
    tone: "warn",
    autopay: false,
  },
  {
    id: "bill-3",
    name: "Internet",
    provider: "FiberNest",
    category: "Utilities",
    amount: currency.format(82),
    dueLabel: "Due May 14",
    statusLabel: "No changes expected",
    tone: "calm",
    autopay: true,
  },
  {
    id: "bill-4",
    name: "Card Payment",
    provider: "Summit Credit",
    category: "Debt",
    amount: currency.format(640),
    dueLabel: "2d overdue",
    statusLabel: "Needs review",
    tone: "danger",
    autopay: false,
  },
];

const demoCategories: CategoryCard[] = [
  { name: "Housing", amount: currency.format(2450), share: 54 },
  { name: "Food", amount: currency.format(780), share: 17 },
  { name: "Utilities", amount: currency.format(340), share: 8 },
  { name: "Transport", amount: currency.format(220), share: 5 },
];

const demoActivity: ActivityItem[] = [
  {
    id: "activity-1",
    title: "Trader Joe's",
    meta: "Food · May 5",
    amount: currency.format(84),
  },
  {
    id: "activity-2",
    title: "FiberNest autopay",
    meta: "Utilities · May 3",
    amount: currency.format(82),
  },
  {
    id: "activity-3",
    title: "Metro pass reload",
    meta: "Transport · May 2",
    amount: currency.format(45),
  },
  {
    id: "activity-4",
    title: "Electric bill",
    meta: "Utilities · May 1",
    amount: currency.format(186),
  },
];

export const getDemoDashboardData = (): DashboardResult => ({
  requiresAuth: false,
  mode: "demo",
  modeLabel: "Supabase is not configured yet. You are viewing seeded preview data.",
  householdName: "Horizon House",
  userLabel: "Demo operator",
  summary:
    "Preview mode shows the bill-tracking layout, KPI structure, and shared-finance workflows before the database is connected.",
  notice:
    "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to switch from demo mode to authenticated household data.",
  metrics: [
    {
      label: "Monthly spend",
      value: compactCurrency.format(4570),
      description: "Across recurring bills and discretionary transactions.",
    },
    {
      label: "Due this week",
      value: currency.format(3276),
      description: "Bills landing in the next seven days.",
    },
    {
      label: "Autopay coverage",
      value: "62%",
      description: "Recurring obligations protected by autopay.",
    },
    {
      label: "Active bills",
      value: "14",
      description: "Shared obligations managed in one workspace.",
    },
  ],
  bills: demoBills,
  categories: demoCategories,
  activity: demoActivity,
});

export async function getDashboardData(): Promise<DashboardResult> {
  if (!isSupabaseConfigured()) {
    return getDemoDashboardData();
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ...getDemoDashboardData(),
      requiresAuth: true,
      notice: null,
    };
  }

  const membershipResponse = await supabase
    .from("household_members")
    .select("role, households(id, name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const membership = membershipResponse.data as MembershipRecord | null;
  const household = Array.isArray(membership?.households)
    ? membership?.households[0]
    : membership?.households;

  if (!household) {
    return {
      requiresAuth: false,
      mode: "live",
      modeLabel: "Authenticated, but no household membership was found yet.",
      householdName: "Unassigned workspace",
      userLabel: user.email ?? "Signed-in member",
      summary:
        "Create a household membership in Supabase to start scoping bills and shared transactions to a workspace.",
      notice:
        "Run the schema in supabase/schema.sql, create a household, and add the signed-in user to household_members.",
      metrics: [
        {
          label: "Monthly spend",
          value: currency.format(0),
          description: "No transactions recorded yet.",
        },
        {
          label: "Due this week",
          value: currency.format(0),
          description: "No upcoming bills yet.",
        },
        {
          label: "Autopay coverage",
          value: "0%",
          description: "No bill accounts configured.",
        },
        {
          label: "Active bills",
          value: "0",
          description: "Add recurring obligations to populate the dashboard.",
        },
      ],
      bills: [],
      categories: [],
      activity: [],
    };
  }

  const [{ data: billRows, error: billsError }, { data: transactionRows, error: transactionsError }] =
    await Promise.all([
      supabase
        .from("bill_accounts")
        .select(
          "id, name, provider, category, amount_due, next_due_on, autopay, status",
        )
        .eq("household_id", household.id)
        .order("next_due_on", { ascending: true })
        .limit(6),
      supabase
        .from("spending_transactions")
        .select("id, merchant, category, amount, spent_at, note")
        .eq("household_id", household.id)
        .order("spent_at", { ascending: false })
        .limit(24),
    ]);

  if (billsError || transactionsError) {
    return {
      ...getDemoDashboardData(),
      requiresAuth: false,
      mode: "live",
      modeLabel: "Authenticated, but the schema is incomplete or empty.",
      householdName: household.name,
      userLabel: user.email ?? "Signed-in member",
      summary:
        "The session is valid, but dashboard tables are not returning live data yet. Seed the household tables to complete the setup.",
      notice:
        "Double-check that the SQL schema has been executed and the signed-in user belongs to a household.",
    };
  }

  const bills = (billRows as BillRecord[] | null) ?? [];
  const transactions = (transactionRows as TransactionRecord[] | null) ?? [];

  const monthlySpend = transactions.reduce(
    (sum, item) => sum + toNumber(item.amount),
    0,
  );

  const dueThisWeek = bills.reduce((sum, bill) => {
    const distance = dayDistance(bill.next_due_on);
    return distance <= 7 ? sum + toNumber(bill.amount_due) : sum;
  }, 0);

  const activeBills = bills.length;
  const autopayCount = bills.filter((bill) => bill.autopay).length;
  const autopayCoverage = activeBills
    ? `${Math.round((autopayCount / activeBills) * 100)}%`
    : "0%";

  const categoryTotals = transactions.reduce<Map<string, number>>((map, transaction) => {
    const key = transaction.category ?? "Uncategorized";
    map.set(key, (map.get(key) ?? 0) + toNumber(transaction.amount));
    return map;
  }, new Map());

  const highestCategoryTotal = Math.max(...categoryTotals.values(), 0);

  return {
    requiresAuth: false,
    mode: "live",
    modeLabel: "Your workspace is connected to Supabase and scoped to the active user session.",
    householdName: household.name,
    userLabel: user.email ?? "Signed-in member",
    summary:
      bills.length > 0
        ? `You have ${bills.length} tracked bills and ${transactions.length} recent transactions loaded from Supabase.`
        : "Your workspace is connected. Add your first bills and transactions to populate the dashboard.",
    notice: null,
    metrics: [
      {
        label: "Monthly spend",
        value: compactCurrency.format(monthlySpend),
        description: "Recent spending captured in this household workspace.",
      },
      {
        label: "Due this week",
        value: currency.format(dueThisWeek),
        description: "Upcoming obligations scheduled within seven days.",
      },
      {
        label: "Autopay coverage",
        value: autopayCoverage,
        description: "Recurring bills currently covered by autopay.",
      },
      {
        label: "Active bills",
        value: String(activeBills),
        description: "Tracked recurring obligations in the workspace.",
      },
    ],
    bills: bills.map((bill) => {
      const distance = dayDistance(bill.next_due_on);

      return {
        id: bill.id,
        name: bill.name,
        provider: bill.provider ?? "Unknown provider",
        category: bill.category ?? "Uncategorized",
        amount: currency.format(toNumber(bill.amount_due)),
        dueLabel: buildDueLabel(bill.next_due_on),
        statusLabel:
          bill.status === "paused"
            ? "Paused"
            : bill.autopay
              ? "Autopay armed"
              : "Manual review",
        tone: buildTone(distance),
        autopay: Boolean(bill.autopay),
      };
    }),
    categories: Array.from(categoryTotals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([name, amount]) => ({
        name,
        amount: currency.format(amount),
        share: highestCategoryTotal ? Math.round((amount / highestCategoryTotal) * 100) : 0,
      })),
    activity: transactions.slice(0, 5).map((transaction) => ({
      id: transaction.id,
      title: transaction.merchant,
      meta: `${transaction.category ?? "Uncategorized"} · ${monthFormatter.format(new Date(transaction.spent_at))}`,
      amount: currency.format(toNumber(transaction.amount)),
    })),
  };
}