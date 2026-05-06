import { AuthShell } from "@/app/auth-shell";

import { isSupabaseConfigured } from "@/lib/env";

import { requestSignUpLink } from "@/app/sign-in/actions";

const messages = {
  "confirm-email": "Account created! Check your email to confirm before signing in.",
  "already-registered": "An account with this email already exists. Sign in instead.",
  "weak-password": "Password must be at least 8 characters.",
  "missing-email": "Please enter your email address.",
  "missing-password": "Please enter a password.",
  "missing-config": "Supabase is not configured. Add the environment variables to continue.",
  error: "Something went wrong. Please try again.",
} as const;

type SignUpPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const message = status ? messages[status as keyof typeof messages] : null;

  return (
    <AuthShell
      mode="sign-up"
      configured={isSupabaseConfigured()}
      status={status}
      message={message}
      action={requestSignUpLink}
    />
  );
}