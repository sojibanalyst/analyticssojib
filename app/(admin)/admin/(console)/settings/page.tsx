import type { Metadata } from "next";
import { AdminState } from "@/components/admin/Table";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "../content-actions";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settings")
    .select("site_name, contact_email, calendly_url, gtm_container_id, sgtm_endpoint, default_currency, retention_days")
    .maybeSingle();

  return (
    <>
      <div className="admin-pagehead">
        <h1>Settings</h1>
        <p>
          Non-secret configuration only. Access tokens and API secrets are not
          here and will not be: they live in environment variables, where a
          screenshot of this page cannot leak them.
        </p>
      </div>

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read settings.">
            {error.message}
          </AdminState>
        </section>
      ) : (
        <section className="admin-card">
          <form action={updateSettings} className="admin-form">
            <div className="admin-field">
              <label htmlFor="site_name">Site name</label>
              <input id="site_name" name="site_name" defaultValue={data?.site_name ?? ""} />
            </div>

            <div className="admin-field">
              <label htmlFor="contact_email">Contact email</label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={data?.contact_email ?? ""}
              />
            </div>

            <div className="admin-field">
              <label htmlFor="calendly_url">Calendly URL</label>
              <input id="calendly_url" name="calendly_url" defaultValue={data?.calendly_url ?? ""} />
            </div>

            <div className="admin-field">
              <label htmlFor="sgtm_endpoint">Server-side GTM endpoint</label>
              <input
                id="sgtm_endpoint"
                name="sgtm_endpoint"
                defaultValue={data?.sgtm_endpoint ?? ""}
                placeholder="https://sgtm.yourdomain.com"
              />
            </div>

            <div className="admin-field">
              <label htmlFor="default_currency">Default currency</label>
              <input
                id="default_currency"
                name="default_currency"
                maxLength={3}
                defaultValue={data?.default_currency ?? "USD"}
              />
            </div>

            <button type="submit" className="admin-button">
              Save
            </button>
          </form>
        </section>
      )}

      <section className="admin-card">
        <h2>Set elsewhere, on purpose</h2>
        <p className="admin-note">
          <strong>GTM container</strong> ({data?.gtm_container_id || "not set"})
          comes from <code>NEXT_PUBLIC_GTM_ID</code>, so production and a
          preview can point at different containers.
        </p>
        <p className="admin-note">
          <strong>Retention</strong> is {data?.retention_days} days. Changing it
          deletes data on a schedule, so it is a migration rather than a text
          box — an accidental keystroke here should not be able to erase a
          year of sessions.
        </p>
      </section>
    </>
  );
}
