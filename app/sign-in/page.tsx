import { AuthShell } from "@/app/auth-shell";

import { isSupabaseConfigured } from "@/lib/env";

import { requestMagicLink } from "./actions";

const messages = {
  "invalid-credentials": "Incorrect email or password. Please try again.",
  "missing-email": "Please enter your email address.",
  "missing-password": "Please enter your password.",
  "missing-config": "Supabase is not configured. Add the environment variables to continue.",
  error: "Something went wrong. Please try again.",
} as const;

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const message = status ? messages[status as keyof typeof messages] : null;
  const configured = isSupabaseConfigured();

  return (
    <AuthShell
      mode="sign-in"
      configured={configured}
      message={message}
      action={requestMagicLink}
    />
  );
}