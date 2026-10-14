import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui/Basics";
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
    .select("site_name, contact_email, calendly_url, gtm_container_id, gtm_head_code, lab_gtm_container_id, lab_gtm_head_code, sgtm_endpoint, default_currency, retention_days")
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle={"Site-wide configuration. Nothing here is secret."}
        help="Destination credentials live on Destinations, encrypted, and are never sent back to the browser."
      />

      {error ? (
        <section className="admin-card">
          <AdminState tone="error" title="Could not read settings.">
            {error.message}
          </AdminState>
        </section>
      ) : (
        <section className="admin-card">
          <SavingForm action={updateSettings} submitLabel="Save changes">
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
                Applies on the next page load. Empty means no container at all.
              </p>
            </div>

            <div className="admin-field">
              <label htmlFor="gtm_head_code">GTM head code</label>
              <textarea
                id="gtm_head_code"
                name="gtm_head_code"
                rows={8}
                defaultValue={data?.gtm_head_code ?? ""}
                placeholder="<!-- Google Tag Manager --> <script>...</script> <!-- End Google Tag Manager -->"
                spellCheck={false}
                className="admin-mono"
              />
              <p className="admin-note">
                Paste the &lt;head&gt; snippet from GTM as is. When set, it is used instead of the container ID.
              </p>
            </div>

            <fieldset className="admin-field admin-labset">
              <legend>Tracking lab (/lab)</legend>
              <p className="admin-note">
                The demo store&rsquo;s own container, for practice. It runs on /lab only; the site&rsquo;s container never does.
              </p>
              <label htmlFor="lab_gtm_container_id">Lab GTM container ID</label>
              <input
                id="lab_gtm_container_id"
                name="lab_gtm_container_id"
                defaultValue={data?.lab_gtm_container_id ?? ""}
                placeholder="GTM-XXXXXXX"
                pattern="^GTM-[A-Z0-9]{4,10}$"
                spellCheck={false}
              />
              <label htmlFor="lab_gtm_head_code">Lab GTM head code</label>
              <textarea
                id="lab_gtm_head_code"
                name="lab_gtm_head_code"
                rows={6}
                defaultValue={data?.lab_gtm_head_code ?? ""}
                placeholder="Optional. Paste a custom loader snippet here instead of the ID."
                spellCheck={false}
                className="admin-mono"
              />
              <p className="admin-note">Empty both to run the lab with no container.</p>
            </fieldset>

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
          <Link href="/admin/destinations" prefetch={false}>Destinations</Link>, encrypted.
        </p>
        <p className="admin-note">
          <strong>GTM container</strong>: the field above wins; <code>NEXT_PUBLIC_GTM_ID</code> is the fallback.
        </p>
        <p className="admin-note">
          <strong>Retention</strong> is {data?.retention_days} days. It changes by migration only, so a typo cannot delete data.
        </p>
      </section>
    </>
  );
}
