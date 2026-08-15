// Relative with an explicit extension so `node --test` can resolve it — the
// runner does not know the @/ alias, and a state machine nobody can unit-test
// is a state machine nobody has checked.
import { DESTINATION_SPECS } from "./destinations.ts";

/**
 * A destination's state, derived — never stored, never typed in.
 *
 * Same principle as the reviews page's placeholder flag: the state is computed
 * from what is actually configured, so it cannot disagree with reality. A
 * stored status column would be one forgotten update away from claiming LIVE
 * about a destination with no credentials.
 *
 *   NOT SET UP  a required credential is missing
 *   READY       everything present, forwarding switch off
 *   LIVE        everything present, forwarding switch on
 *
 * Note what LIVE does NOT claim: that the credentials work. Only a test can
 * say that, which is why the card shows the test result separately. A green
 * pill next to an untested credential would be exactly the false assurance
 * this console is meant to remove.
 */
export type DestinationState = "not_set_up" | "ready" | "live";

export type StateInputs = {
  key: string;
  enabled: boolean;
  config: Record<string, unknown> | null;
  /** True when a credential exists — in the database or in the environment. */
  hasSecret: boolean;
};

export function destinationState(input: StateInputs): DestinationState {
  const spec = DESTINATION_SPECS[input.key];
  if (!spec) return "not_set_up";

  const config = input.config ?? {};

  // The public identifier counts as required whenever the destination
  // declares one: GA4 cannot be called without a measurement_id, and Meta
  // cannot be called without a pixel id.
  const publicOk = !spec.public || Boolean(String(config[spec.public.key] ?? "").trim());

  // A destination with no secret in its spec — sGTM — is complete without one.
  const secretOk = !spec.secret || input.hasSecret;

  if (!publicOk || !secretOk) return "not_set_up";
  return input.enabled ? "live" : "ready";
}

export const STATE_LABEL: Record<DestinationState, string> = {
  not_set_up: "Not set up",
  ready: "Ready",
  live: "Live",
};

/** warn for READY: configured but not forwarding is a state worth noticing. */
export const STATE_TONE: Record<DestinationState, "info" | "warn" | "success"> = {
  not_set_up: "info",
  ready: "warn",
  live: "success",
};

/** What is still missing, for the card to say so rather than just refuse. */
export function missingFor(input: StateInputs): string[] {
  const spec = DESTINATION_SPECS[input.key];
  if (!spec) return ["an unknown destination"];

  const config = input.config ?? {};
  const missing: string[] = [];

  if (spec.public && !String(config[spec.public.key] ?? "").trim()) {
    missing.push(spec.public.label);
  }
  if (spec.secret && !input.hasSecret) {
    missing.push(spec.secret.label);
  }
  return missing;
}
