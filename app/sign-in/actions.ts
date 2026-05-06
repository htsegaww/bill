"use server";

import { redirect } from "next/navigation";

import { getBaseUrl, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const statusRedirect = (status: string) => redirect(`/sign-in?status=${status}`);
const signUpStatusRedirect = (status: string) => redirect(`/sign-up?status=${status}`);

export async function requestMagicLink(formData: FormData) {
  const email = formData.get("email");
  const emailValue = typeof email === "string" ? email.trim() : "";

  if (!emailValue) {
    statusRedirect("missing-email");
  }

  if (!isSupabaseConfigured()) {
    statusRedirect("missing-config");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailValue,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    statusRedirect("error");
  }

  statusRedirect("sent");
}

export async function requestSignUpLink(formData: FormData) {
  const email = formData.get("email");
  const emailValue = typeof email === "string" ? email.trim() : "";

  if (!emailValue) {
    signUpStatusRedirect("missing-email");
  }

  if (!isSupabaseConfigured()) {
    signUpStatusRedirect("missing-config");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailValue,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${getBaseUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    signUpStatusRedirect("error");
  }

  signUpStatusRedirect("sent");
}