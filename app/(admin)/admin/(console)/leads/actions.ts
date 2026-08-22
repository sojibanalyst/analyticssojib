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

/**
 * Archive, erase, rescue.
 *
 * Two different operations on purpose, and the difference is the point.
 *
 * ARCHIVE is what "delete" usually means: I am finished with this lead, get it
 * off my screen. It keeps the row, the attribution, the click ids and the
 * generate_lead event, and it is reversible. A business record should not be
 * destroyed to tidy a list, and an enquiry from a real prospect is a business
 * record.
 *
 * ERASE is the other thing: this must genuinely not exist. A deletion request
 * from someone in the UK or the EU, or a test row. It is irreversible and it
 * takes the click ids with it, because a gclid IS that person's click and
 * deleting the enquiry while keeping it would be erasure in name only.
 *
 * Both go through security-definer functions rather than table writes: the
 * work spans leads, events, booking_intents and the log, and it has to be all
 * or nothing. The functions check is_admin() themselves, so an action invoked
 * directly as a POST cannot skip it.
 */
export async function archiveLead(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);

  const id = String(formData.get("id") ?? "");
  if (!id) return fail(ACTION_ERRORS.noId);
  const restore = formData.get("restore") === "on";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_lead", {
    p_id: id,
    p_restore: restore,
  });
  if (error) return fail(error.message);
  if (!data) return fail("That lead no longer exists.");

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return ok(restore ? "Restored to the working list." : "Archived.");
}

export async function eraseLead(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);
  // The same two-step confirm the case studies use — one tick, checked in the
  // browser and again here, rather than a second pattern to learn.
  if (formData.get("confirm") !== "on") return fail(ACTION_ERRORS.notConfirmed);

  const id = String(formData.get("id") ?? "");
  if (!id) return fail(ACTION_ERRORS.noId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("erase_lead", { p_id: id });
  if (error) return fail(error.message);
  if (!data) return fail("That lead no longer exists.");

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return ok("Erased. The conversion is still counted; everything identifying is gone.");
}

export async function rescueRejection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);

  const id = String(formData.get("id") ?? "");
  if (!id) return fail(ACTION_ERRORS.noId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rescue_rejection", { p_id: id });
  if (error) {
    return fail(
      error.message.includes("no_email")
        ? "That submission has no email address, so there is nobody to reply to."
        : error.message,
    );
  }
  if (!data) return fail("That submission is no longer there.");

  revalidatePath("/admin/leads");
  return ok("Moved into Leads. No generate_lead event: the conversion did not happen when it was refused.");
}

export async function eraseRejection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);
  if (formData.get("confirm") !== "on") return fail(ACTION_ERRORS.notConfirmed);

  const id = String(formData.get("id") ?? "");
  if (!id) return fail(ACTION_ERRORS.noId);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("erase_rejection", { p_id: id });
  if (error) return fail(error.message);
  if (!data) return fail("That submission is no longer there.");

  revalidatePath("/admin/leads");
  return ok("Erased.");
}
