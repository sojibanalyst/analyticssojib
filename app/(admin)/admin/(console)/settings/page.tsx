import type { Metadata } from "next";
import Link from "next/link";
import { AdminState } from "@/components/admin/Table";
import { SavingForm } from "@/components/admin/SavingForm";
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
          Site-wide configuration, none of it secret. Destination credentials
          are not on this page — they are set on{" "}
          <Link href="/admin/destinations" prefetch={false}>Destinations</Link>, encrypted into
          Supabase Vault, and never sent back to the browser. A screenshot of
          either page cannot leak one, because neither page has ever been given
          the value to show.
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
          <SavingForm action={updateSettings}>
            <div className="admin-field">
              <label htmlFor="gtm_container_id">GTM container ID</label>
              <input
                id="gtm_container_id"
                name="gtm_container_id"
                defaultValue={data?.gtm_container_id ?? ""}
                placeholder="GTM-XXXXXXX"
                pattern="^GTM-[A-Z0-9]{4,10}$"
                spellCheck={false}
              />
              <p className="admin-note">
                Takes effect on the next page load — no redeploy. Leave it empty
                and no container script is rendered at all, rather than a broken
                one.
              </p>
            </div>

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
              <input
                id="calendly_url"
                name="calendly_url"
                className="admin-mono"
                defaultValue={data?.calendly_url ?? ""}
              />
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
          </SavingForm>
        </section>
      )}

      <section className="admin-card">
        <h2>Set elsewhere, on purpose</h2>
        <p className="admin-note">
          <strong>Destination credentials</strong> are on{" "}
          <Link href="/admin/destinations" prefetch={false}>Destinations</Link>, one per platform. Each
          is stored encrypted and can be rotated from that screen without a
          redeploy; an environment variable is still read as a fallback if no
          value has been set there.
        </p>
        <p className="admin-note">
          <strong>GTM container</strong> is set above and read at request time.{" "}
          <code>NEXT_PUBLIC_GTM_ID</code> is still read as a fallback when the
          field is empty, so a deployment configured before this existed keeps
          working — but the field wins, and changing it needs no redeploy.
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
