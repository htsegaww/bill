import { AuthShell } from "@/app/auth-shell";

import { isSupabaseConfigured } from "@/lib/env";

import { requestMagicLink } from "./actions";

const messages = {
  sent: "A magic link has been sent. Open it on this device to finish signing in.",
  error: "Supabase could not send the magic link. Check your project settings and email auth provider.",
  "missing-email": "Enter an email address to continue.",
  "missing-config": "Supabase environment variables are missing. Add them before testing auth.",
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