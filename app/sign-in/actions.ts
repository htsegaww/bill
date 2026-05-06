"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
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
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      signUpStatusRedirect("already-registered");
    }
    signUpStatusRedirect("error");
  }

  signUpStatusRedirect("confirm-email");
}