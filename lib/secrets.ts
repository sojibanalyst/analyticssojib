import "server-only";

import { DESTINATION_SPECS } from "@/lib/destinations";
import { redactSecrets } from "@/lib/redact";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Reading destination credentials, and keeping them out of everything else.
 *
 * `server-only` is load-bearing here, unlike on lib/collector.ts: importing
 * this into a client component would put a secret-reading path into the
 * browser bundle. The import fails the build instead.
 */

export type SecretSource = "database" | "env" | "none";

export type SecretLookup = {
  value: string | null;
  source: SecretSource;
};

/**
 * Database first, then the environment, then nothing.
 *
 * The order matters: the console is the place a credential is rotated, so a
 * value set there has to win over one baked into the deployment. The env var
 * remains as a fallback so a destination configured before this existed keeps
 * working, and so a deployment can run without anyone opening the console.
 *
 * Returns `none` rather than throwing when neither is present. A missing
 * credential is a configuration state the Destinations screen reports as "Not
 * set up"; discovering it by exception at send time, halfway through a
 * fan-out, is how events get lost.
 */
export async function getDestinationSecret(key: string): Promise<SecretLookup> {
  const spec = DESTINATION_SPECS[key];

  // service_role: get_destination_secret is granted to that role and no other,
  // which is what makes the console field write-only.
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.rpc("get_destination_secret", { p_key: key });
    if (!error && typeof data === "string" && data.length > 0) {
      return { value: data, source: "database" };
    }
  } catch {
    // No service role key in this environment (a preview, or a local run).
    // Fall through to the env var rather than failing.
  }

  const fromEnv = spec?.secret ? process.env[spec.secret.envVar] : undefined;
  if (fromEnv) return { value: fromEnv, source: "env" };

  return { value: null, source: "none" };
}

/**
 * Record why a destination failed, with the credential taken out first.
 *
 * Everything that writes to destinations.last_error should come through here.
 *
 * The database enforces the same redaction on that column with a trigger.
 * Deliberate duplication: this keeps the credential out of the platform log,
 * the trigger keeps it out of the table, and neither can be skipped by a
 * future caller who forgets the other.
 * The trigger is the backstop; this is the front door, and it also scrubs the
 * copy that goes to the platform log.
 */
export async function recordDestinationError(
  key: string,
  message: string,
  secret?: string | null,
): Promise<void> {
  const safe = redactSecrets(message, secret).slice(0, 1000);

  console.error(`destination ${key} failed: ${safe}`);

  try {
    const supabase = getAdminClient();
    await supabase
      .from("destinations")
      .update({ last_error: safe, last_error_at: new Date().toISOString() })
      .eq("key", key);
  } catch {
    // Nowhere to record it. The console.error above already happened.
  }
}
