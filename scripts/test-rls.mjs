// Diagnostic: test querying household_members as the actual user
// Run: node scripts/test-rls.mjs
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const get = (k) => env.match(new RegExp(k + "=(.+)"))?.[1]?.trim();

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const USER_EMAIL = "henokabay10010@gmail.com";

// 1. Create a session for the user as admin
const sessionRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
});
const { users } = await sessionRes.json();
const user = users?.find((u) => u.email === USER_EMAIL);
if (!user) { console.error("User not found"); process.exit(1); }

// 2. Sign in as the user to get a JWT (using admin sign-in token endpoint)
const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=user_token`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ user_id: user.id }),
});

if (!tokenRes.ok) {
  const txt = await tokenRes.text();
  console.log("token endpoint failed:", tokenRes.status, txt);

  // Fallback: check directly whether RLS policies exist
  console.log("\nChecking RLS policies via rpc...");
  const checkRes = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/is_household_member`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_household_id: "119e4718-67fa-47a6-95b7-f63e3c7dd632" }),
    }
  );
  console.log("is_household_member function status:", checkRes.status);
  const checkBody = await checkRes.text();
  console.log("result:", checkBody);
  process.exit(0);
}

const { access_token } = await tokenRes.json();
console.log("Got user JWT:", access_token ? "yes" : "no");

// 3. Now query household_members AS this user (with RLS applied)
const queryRes = await fetch(
  `${SUPABASE_URL}/rest/v1/household_members?select=household_id,role`,
  {
    headers: {
      apikey: get("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
    },
  }
);
const queryBody = await queryRes.json();
console.log("Query as user (RLS applied):", JSON.stringify(queryBody, null, 2));
