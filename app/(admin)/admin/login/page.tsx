import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

/** Messages for the reasons a redirect can land here. */
const ERRORS: Record<string, string> = {
  not_allowed: "That address is not allowed into this console.",
  expired: "That link has expired or was already used. Request a new one.",
  missing_code: "That link was incomplete. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next?.startsWith("/admin") && !params.next.startsWith("//")
      ? params.next
      : "/admin";

  return (
    <div className="admin-login">
      <LoginForm next={next} initialError={params.error ? ERRORS[params.error] : undefined} />
    </div>
  );
}
