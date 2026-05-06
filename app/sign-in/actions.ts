"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusRedirect = (status: string) => redirect(`/sign-in?status=${status}`);
const signUpStatusRedirect = (status: string) => redirect(`/sign-up?status=${status}`);

export async function requestMagicLink(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? (formData.get("email") as string).trim() : "";
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";

  if (!email) statusRedirect("missing-email");
  if (!password) statusRedirect("missing-password");
  if (!isSupabaseConfigured()) statusRedirect("missing-config");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("invalid")) {
      statusRedirect("invalid-credentials");
    }
    statusRedirect("error");
  }

  redirect("/dashboard");
}

export async function requestSignUpLink(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? (formData.get("email") as string).trim() : "";
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";

  if (!email) signUpStatusRedirect("missing-email");
  if (!password) signUpStatusRedirect("missing-password");
  if (password.length < 8) signUpStatusRedirect("weak-password");
  if (!isSupabaseConfigured()) signUpStatusRedirect("missing-config");

  const supabase = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  // Create the user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });

  if (signUpError) {
    if (signUpError.message.toLowerCase().includes("already registered")) {
      signUpStatusRedirect("already-registered");
    }
    signUpStatusRedirect("error");
  }

  const userId = authData.user?.id;
  if (!userId) signUpStatusRedirect("error");

  // Auto-confirm the email so user doesn't have to click a link
  try {
    await admin.auth.admin.updateUserById(userId!, {
      email_confirm: true,
    });
  } catch {
    // If this fails, user will still be able to sign in
  }

  // Auto-create a personal household for this user
  try {
    const displayName = email.split("@")[0]; // e.g., "henok" from "henok@example.com"
    const householdName = `${displayName}'s Household`;

    const { data: household, error: hhError } = await admin
      .from("households")
      .insert({ name: householdName, created_by: userId! })
      .select()
      .single();

    if (!hhError && household) {
      // Add the user to the household as owner
      await admin.from("household_members").insert({
        household_id: household.id,
         user_id: userId!,
        role: "owner",
      });
    }
  } catch {
    // If household creation fails, user can still continue
  }

  // Auto-sign them in
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    signUpStatusRedirect("error");
  }

  redirect("/dashboard");
}