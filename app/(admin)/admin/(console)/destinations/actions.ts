"use server";

import { revalidatePath } from "next/cache";
import { isAllowedEmail } from "@/lib/auth";
import { ACTION_ERRORS, fail, ok, type ActionState } from "@/lib/action-state";
import { DESTINATION_SPECS } from "@/lib/destinations";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

/**
 * Saving a destination's configuration.
 *
 * The public identifier and the secret take different routes on purpose:
 *
 *   public id  →  an ordinary update to destinations.config
 *   secret     →  set_destination_secret(), which writes to Supabase Vault
 *                 and returns nothing
 *
 * Both go through the admin's own session, so RLS and the is_admin() check
 * inside the function apply. This never touches the service role — that key
 * is for the collector and the fan-out worker, and reaching for it here to
 * read a secret back would defeat the whole design.
 */
export async function saveDestination(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);

  const key = String(formData.get("key") ?? "");
  const spec = DESTINATION_SPECS[key];
  if (!spec) return fail("Unknown destination.");

  const supabase = await createClient();
  const enabled = formData.get("enabled") === "on";

  // --- the public identifier ------------------------------------------------
  if (spec.public) {
    const raw = String(formData.get(spec.public.key) ?? "").trim();

    // Re-checked here, not just through the input's pattern attribute:
    // `pattern` is a convenience for the person typing, not a control. A
    // malformed id saved now becomes a silent 400 from the platform weeks
    // later, which is the hardest kind of bug to trace back to a text box.
    if (raw && spec.public.pattern && !new RegExp(spec.public.pattern).test(raw)) {
      return fail(spec.public.patternHint ?? `That is not a valid ${spec.public.label}.`);
    }

    const { data: current } = await supabase
      .from("destinations")
      .select("config")
      .eq("key", key)
      .maybeSingle();

    // Merged rather than replaced: config may hold keys this form does not
    // render, and a blind overwrite would drop them.
    const config = { ...((current?.config ?? {}) as Record<string, string>) };
    if (raw) config[spec.public.key] = raw;
    else delete config[spec.public.key];

    const { error } = await supabase
      .from("destinations")
      .update({ config: config as Json, enabled })
      .eq("key", key);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase
      .from("destinations")
      .update({ enabled })
      .eq("key", key);
    if (error) return fail(error.message);
  }

  // --- the secret -----------------------------------------------------------
  if (spec.secret) {
    const secret = String(formData.get("secret") ?? "").trim();

    // Blank means "leave it alone". The field renders empty on every load by
    // design, so treating blank as a delete would wipe the credential every
    // time the enabled checkbox was toggled.
    if (secret) {
      const { error } = await supabase.rpc("set_destination_secret", {
        p_key: key,
        p_secret: secret,
      });
      // Deliberately not echoing the database message: the RPC does not put
      // the value in it today, and this keeps that true if it ever changes.
      if (error) return fail("Could not store the credential.");
    }
  }

  revalidatePath("/admin/destinations");
  return ok(`${spec.label} saved.`);
}

/** Removes the stored credential. The env var fallback, if any, takes over. */
export async function clearDestinationSecret(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);
  if (formData.get("confirm") !== "on") return fail(ACTION_ERRORS.notConfirmed);

  const key = String(formData.get("id") ?? "");
  if (!key) return fail(ACTION_ERRORS.noId);

  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_destination_secret", { p_key: key });
  if (error) return fail("Could not remove the credential.");

  revalidatePath("/admin/destinations");
  return ok("Credential removed.");
}
