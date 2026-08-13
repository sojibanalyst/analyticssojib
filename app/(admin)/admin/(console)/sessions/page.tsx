import type { Metadata } from "next";
import { AdminState, AdminTable, Ago } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sessions",
  robots: { index: false, follow: false },
};

const LIMIT = 100;

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `session_id, first_seen_at, last_seen_at, landing_page, device_type, country,
       first_touch_source, first_touch_medium, first_touch_campaign,
       last_touch_source, last_touch_medium,
       gclid, fbclid, ttclid, msclkid`,
    )
    .order("last_seen_at", { ascending: false })
    .limit(LIMIT);

  return (
    <>
      <div className="admin-pagehead">
        <h1>Sessions</h1>
        <p>
          First touch is written once and never overwritten; last touch is
          rewritten on every visit. That split is what lets a lead be credited
          to the campaign that originally found them rather than to the reload
          that happened to be last.
        </p>
      </div>

      <section className="admin-card">
        {error ? (
          <AdminState tone="error" title="Could not read sessions.">
            {error.message}
          </AdminState>
        ) : !data?.length ? (
          <AdminState title="No sessions yet.">
            A session is only created when a visitor allows analytics storage.
            Declined visits are counted but never given an identifier.
          </AdminState>
        ) : (
          <AdminTable
            caption="Recent sessions"
            columns={["Last seen", "First touch", "Last touch", "Landing", "Device", "Click ID"]}
          >
            {data.map((session) => {
              const clickId =
                (session.gclid && "gclid") ||
                (session.fbclid && "fbclid") ||
                (session.ttclid && "ttclid") ||
                (session.msclkid && "msclkid") ||
                null;

              return (
                <tr key={session.session_id}>
                  <td>
                    <Ago iso={session.last_seen_at} />
                  </td>
                  <td style={{ color: "var(--ink)" }}>
                    {session.first_touch_source ?? "—"}
                    {session.first_touch_medium ? ` / ${session.first_touch_medium}` : ""}
                    {session.first_touch_campaign ? (
                      <div style={{ color: "var(--ink-muted)" }}>
                        {session.first_touch_campaign}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {session.last_touch_source ?? "—"}
                    {session.last_touch_medium ? ` / ${session.last_touch_medium}` : ""}
                  </td>
                  <td>{session.landing_page ?? "—"}</td>
                  <td>
                    {session.device_type}
                    {session.country ? ` · ${session.country}` : ""}
                  </td>
                  <td>
                    {clickId ? (
                      <span className="admin-pill" data-tone="info">
                        {clickId}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        )}
      </section>
    </>
  );
}
