"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/collector";

/**
 * The public enquiry form's Server Action.
 *
 * It uses the ORDINARY client, not the service role. Everything it is allowed
 * to do is expressed by `submit_lead`, the one function anon may execute; if
 * that function is wrong, this cannot make it worse. Reaching for
 * getAdminClient() here would have been the shortcut.
 *
 * Being a Server Action rather than a route also keeps the page it lives on
 * static: actions are POST endpoints of their own and do not drag the
 * rendering of the page into dynamic.
 */

export type LeadState = {
  status: "idle" | "sent" | "error";
  message: string;
  /** Passed back so the browser can fire generate_lead with the same id. */
  eventId?: string;
};

const PLATFORMS = new Set([
  "shopify",
  "woocommerce",
  "custom",
  "other",
  "",
]);

const ERRORS: Record<string, string> = {
  name_invalid: "Please enter your name.",
  email_invalid: "That email address does not look right.",
  too_soon: "That looks like a duplicate — your first message is already in.",
};

export async function submitLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  // Honeypot. A field positioned off-screen and hidden from assistive tech,
  // which a person never sees and a form-filling bot almost always completes.
  // Answering "sent" rather than "error" means the bot has no signal to learn
  // from.
  if (String(formData.get("company_website") ?? "")) {
    return { status: "sent", message: "Thanks — I'll reply personally, usually within a day." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const platformRaw = String(formData.get("platform") ?? "").trim().toLowerCase();
  const platform = PLATFORMS.has(platformRaw) ? platformRaw : "other";
  const problem = String(formData.get("problem") ?? "").trim().slice(0, 4000);

  if (!name) return { status: "error", message: ERRORS.name_invalid };
  if (!email.includes("@")) return { status: "error", message: ERRORS.email_invalid };

  // The session cookie is HttpOnly, so only the server can read it. That is
  // also why attribution cannot be faked from the page: the browser never
  // sees, and never sends, the id it would need to lie about.
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_lead", {
    p_name: name,
    p_email: email,
    p_company: company || undefined,
    p_platform: platform || undefined,
    p_answers: problem ? { problem } : {},
    p_session_id: sessionId ?? undefined,
  });

  if (error) {
    // Postgres raises the reason as the message; anything unrecognised gets a
    // generic reply rather than leaking the database's words to the page.
    const known = Object.keys(ERRORS).find((key) => error.message.includes(key));
    return {
      status: "error",
      message: known
        ? ERRORS[known]
        : "Something went wrong sending that. Email me directly and I'll pick it up.",
    };
  }

  return {
    status: "sent",
    message: "Thanks — I'll reply personally, usually within a day.",
    eventId: typeof data === "string" ? data : undefined,
  };
}
