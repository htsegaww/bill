const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const https = require("https");

const env = fs.readFileSync(".env", "utf8");
const get = (key) => env.match(new RegExp(key + "=(.+)"))?.[1]?.trim();

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");

// Polyfill fetch for older Node environments
if (typeof globalThis.fetch === "undefined") {
  const { default: nodeFetch } = require("node-fetch").catch(() => null) || {};
  if (nodeFetch) globalThis.fetch = nodeFetch;
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    fetch: (...args) => {
      const [resource, init] = args;
      return new Promise((resolve, reject) => {
        const urlObj = new URL(resource);
        const options = {
          hostname: urlObj.hostname,
          path: urlObj.pathname + urlObj.search,
          method: init?.method || "GET",
          headers: init?.headers || {},
        };
        const req = https.request(options, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            resolve({
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              json: () => Promise.resolve(JSON.parse(data)),
              text: () => Promise.resolve(data),
              headers: { get: (h) => res.headers[h.toLowerCase()] },
            });
          });
        });
        req.on("error", reject);
        if (init?.body) req.write(init.body);
        req.end();
      });
    },
  },
});

async function run() {
  const email = "henokabay10010@gmail.com";
  const householdName = "My Household";

  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error("listUsers error:", listErr.message);
    process.exit(1);
  }

  const user = listData.users.find((u) => u.email === email);
  if (!user) {
    console.error("No user found with email:", email);
    process.exit(1);
  }
  console.log("Found user:", user.id, user.email);

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (existing) {
    console.log("User already has a household:", existing.household_id);
    return;
  }

  const { data: household, error: hhErr } = await supabase
    .from("households")
    .insert({ name: householdName, created_by: user.id })
    .select()
    .single();
  if (hhErr) {
    console.error("household insert error:", hhErr.message);
    process.exit(1);
  }
  console.log("Created household:", household.id, household.name);

  const { error: memErr } = await supabase
    .from("household_members")
    .insert({ household_id: household.id, user_id: user.id, role: "owner" });
  if (memErr) {
    console.error("member insert error:", memErr.message);
    process.exit(1);
  }

  console.log('Done — henokabay10010@gmail.com is now owner of "My Household"');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
