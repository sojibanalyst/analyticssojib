"use server";

import { revalidatePath } from "next/cache";
import { isAllowedEmail } from "@/lib/auth";
import { createClient, getUser } from "@/lib/supabase/server";
import { LEAD_STATUSES, type LeadStatus } from "./statuses";
import { ACTION_ERRORS, fail, ok, type ActionState } from "@/lib/action-state";

/**
 * Move a lead along the pipeline.
 *
 * Checks the allowlist here as well as in the layout, because a Server Action
 * is a POST endpoint of its own: it can be invoked directly, and the layout
 * guard that protects the page does not run for it. The RLS policy is still
 * the layer that actually holds — this write goes through the caller's own
 * session, so a non-admin's request is denied by the database whatever this
 * code does.
 */
export async function setLeadStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!id) return fail(ACTION_ERRORS.noId);
  if (!LEAD_STATUSES.includes(status)) return fail("That is not a valid status.");

  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return ok(`Marked ${status}.`);
}
