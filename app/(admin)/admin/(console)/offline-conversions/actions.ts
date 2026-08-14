"use server";

import { revalidatePath } from "next/cache";
import { isAllowedEmail } from "@/lib/auth";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  evaluateLead,
  isOfflineDestination,
  type LeadForUpload,
} from "@/lib/offline";
import { ACTION_ERRORS, fail, ok, type ActionState } from "@/lib/action-state";

/**
 * Builds an upload batch.
 *
 * It is a **dry run and nothing else**. It reads leads, decides each one's
 * fate, and writes the decisions down. Nothing is sent to Google or Meta —
 * that needs API credentials this project does not hold, and the export is
 * downloaded and imported by hand until it does.
 *
 * Writing the rejected rows is the point. An upload that reports "12 of 40
 * sent" and forgets the other 28 is how an offline import quietly stops
 * working for a quarter.
 */
export async function buildUpload(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) return fail(ACTION_ERRORS.notAllowed);

  const destination = String(formData.get("destination") ?? "");
  const conversionAction = String(formData.get("conversion_action") ?? "").trim();
  if (!isOfflineDestination(destination)) return fail("Pick a destination first.");

  const supabase = await createClient();

  const settings = await supabase.from("settings").select("default_currency").maybeSingle();
  const currency = settings.data?.default_currency ?? "USD";

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, created_at, status, value, currency, gclid, fbclid, ttclid, msclkid, consent")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return fail(error.message);

  // Date.now() once, passed in, so every row in a batch is judged against the
  // same instant rather than drifting across a long loop.
  const now = Date.now();
  const rows = (leads ?? []).map((lead) =>
    evaluateLead(lead as LeadForUpload, destination, currency, now),
  );

  const eligible = rows.filter((row) => row.result === "eligible").length;

  const { data: upload, error: uploadError } = await supabase
    .from("offline_conversion_uploads")
    .insert({
      destination,
      conversion_action: conversionAction || null,
      value_source: "leads.value",
      currency,
      time_source: "leads.created_at",
      status: "draft",
      dry_run: true,
      row_count: rows.length,
      accepted_count: 0,
      rejected_count: rows.length - eligible,
      result_message:
        `Dry run: ${eligible} of ${rows.length} lead(s) eligible. ` +
        "Nothing was sent — export the CSV and import it by hand.",
    })
    .select("id")
    .single();

  if (uploadError || !upload) return fail(uploadError?.message ?? "Could not create the batch.");

  if (rows.length) {
    await supabase
      .from("offline_conversion_rows")
      .insert(rows.map((row) => ({ ...row, upload_id: upload.id })));
  }

  revalidatePath("/admin/offline-conversions");
  return ok(`Dry run built: ${eligible} of ${rows.length} lead(s) eligible.`);
}
