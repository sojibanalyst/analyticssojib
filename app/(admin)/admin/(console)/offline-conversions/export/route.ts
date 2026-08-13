import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth";
import { createClient, getUser } from "@/lib/supabase/server";
import { toGoogleAdsCsv, type EvaluatedRow } from "@/lib/offline";

/**
 * Downloads a batch as a Google Ads click-conversion CSV.
 *
 * A route handler rather than a link to a stored file: nothing is written to
 * disk or to storage, so there is no export sitting around with click ids in
 * it waiting to be found. It is generated on request and only for someone who
 * is signed in.
 *
 * The allowlist is re-checked here. proxy.ts covers /admin/* and would already
 * have redirected, but a download URL is exactly the sort of thing that gets
 * pasted somewhere, and one guard is not a boundary.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!isAllowedEmail(user?.email)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const uploadId = request.nextUrl.searchParams.get("upload");
  if (!uploadId) return new NextResponse("Missing upload", { status: 400 });

  const supabase = await createClient();

  const { data: upload } = await supabase
    .from("offline_conversion_uploads")
    .select("id, conversion_action, destination")
    .eq("id", uploadId)
    .maybeSingle();

  if (!upload) return new NextResponse("Not found", { status: 404 });

  const { data: rows } = await supabase
    .from("offline_conversion_rows")
    .select("lead_id, result, reason, click_id, click_id_kind, value, currency, conversion_time")
    .eq("upload_id", uploadId)
    .eq("result", "eligible")
    .limit(5000);

  const csv = toGoogleAdsCsv(
    (rows ?? []) as EvaluatedRow[],
    upload.conversion_action ?? "Conversion",
  );

  return new NextResponse(csv, {
    headers: {
      // text/csv with an explicit charset: Excel guesses otherwise, and it
      // guesses wrong on anything non-ASCII.
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="offline-${upload.destination}-${uploadId.slice(0, 8)}.csv"`,
      // Contains click ids. No cache, anywhere, ever.
      "Cache-Control": "no-store, private",
    },
  });
}
