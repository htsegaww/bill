import { AuthShell } from "@/app/auth-shell";

import { isSupabaseConfigured } from "@/lib/env";

import { requestSignUpLink } from "@/app/sign-in/actions";

const messages = {
  sent: "Your sign-up link is on the way. Open it to create your account and continue to the dashboard.",
  error: "Supabase could not create a sign-up link. Check that email auth is enabled for your project.",
  "missing-email": "Enter an email address to create your account.",
  "missing-config": "Supabase environment variables are missing. Add them before testing sign-up.",
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
      message={message}
      action={requestSignUpLink}
    />
  );
}