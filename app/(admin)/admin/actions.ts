"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message: string;
};

/** Only ever redirect inside the console. Anything else is an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

/**
 * The callback has to be an absolute URL, and it has to be THIS deployment's —
 * a preview build must return to its own preview origin, not to production.
 * Reading it from the request headers is what makes that work without an env
 * var per environment.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Sends a magic link — a one-time sign-in URL emailed to the address, so there
 * is no password to store, leak, or rotate.
 *
 * Non-allowlisted addresses get the same reply but no email. Two reasons:
 * it does not tell a stranger whether an address is the admin's, and it stops
 * Supabase creating an auth user for every address anyone types in.
 */
export async function requestMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const sent: LoginState = {
    status: "sent",
    message: "If that address can sign in, a link is on its way. It expires in 1 hour.",
  };

  if (!isAllowedEmail(email)) return sent;

  const supabase = await createClient();
  const origin = await requestOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // True so the owner's first sign-in works without a pre-created user.
      // It is safe only because the allowlist check above already ran: the
      // sole address that reaches this call is one that is permitted to exist.
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: `Could not send the link: ${error.message}`,
    };
  }

  return sent;
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
