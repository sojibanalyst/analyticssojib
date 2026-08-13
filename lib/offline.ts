import type { Database } from "@/lib/supabase/types";

/**
 * Offline conversions: deciding which leads can be sent back to an ad
 * platform, and why the rest cannot.
 *
 * The rule this module exists to enforce: **no lead is ever silently
 * excluded**. Every row that does not go gets a reason in plain words, stored
 * alongside it. "We uploaded 12 of 40" with no explanation for the other 28 is
 * how offline conversion imports quietly stop working for months.
 */

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type RowResult = Database["public"]["Enums"]["row_result"];

/** The click id each destination needs, and what it is called in the export. */
export const DESTINATION_CLICK_ID = {
  google_ads: { column: "gclid", label: "Google Click ID" },
  meta_capi: { column: "fbclid", label: "Meta Click ID" },
  tiktok_events: { column: "ttclid", label: "TikTok Click ID" },
} as const;

export type OfflineDestination = keyof typeof DESTINATION_CLICK_ID;

export function isOfflineDestination(value: string): value is OfflineDestination {
  return value in DESTINATION_CLICK_ID;
}

/**
 * Which lead statuses count as a conversion worth uploading.
 *
 * `won` and `booked` only. Uploading `qualified` would teach the platform to
 * optimise for people who looked promising rather than people who paid, which
 * is the mistake that makes offline conversion data worse than no data.
 */
export const CONVERTED: LeadStatus[] = ["booked", "won"];

export type LeadForUpload = {
  id: string;
  created_at: string;
  status: LeadStatus;
  value: number | null;
  currency: string | null;
  gclid: string | null;
  fbclid: string | null;
  ttclid: string | null;
  msclkid: string | null;
  consent: unknown;
};

export type EvaluatedRow = {
  lead_id: string;
  result: RowResult;
  reason: string | null;
  click_id: string | null;
  click_id_kind: string | null;
  value: number | null;
  currency: string | null;
  conversion_time: string | null;
};

/** Google Ads rejects clicks older than 90 days. */
const MAX_AGE_DAYS = 90;

export function daysBetween(from: string, to: number): number {
  return Math.floor((to - new Date(from).getTime()) / 86_400_000);
}

/**
 * Decides one lead's fate for one destination.
 *
 * `now` is a parameter rather than read from the clock so this is a pure
 * function and the age rule can be tested without waiting 90 days.
 */
export function evaluateLead(
  lead: LeadForUpload,
  destination: OfflineDestination,
  defaultCurrency: string,
  now: number,
): EvaluatedRow {
  const { column } = DESTINATION_CLICK_ID[destination];
  const clickId = lead[column] ?? null;

  const base = {
    lead_id: lead.id,
    click_id: clickId,
    click_id_kind: column,
    value: lead.value,
    currency: lead.currency ?? defaultCurrency,
    conversion_time: lead.created_at,
  };

  if (!CONVERTED.includes(lead.status)) {
    return {
      ...base,
      result: "ineligible",
      reason: `Status is "${lead.status}". Only ${CONVERTED.join(" and ")} count as a conversion.`,
    };
  }

  if (!clickId) {
    return {
      ...base,
      result: "ineligible",
      reason:
        `No ${column} on this lead — they did not arrive from a ${destination.replace("_", " ")} click, ` +
        "so there is nothing for the platform to match against.",
    };
  }

  // Consent is per-event and recorded when the visit happened. Uploading a
  // conversion for someone who declined ad storage would send their click id
  // to an ad platform after they said no.
  const consent = (lead.consent ?? {}) as Record<string, string>;
  if (consent.ad_storage === "denied") {
    return {
      ...base,
      result: "ineligible",
      reason: "Visitor declined ad storage. Their click id must not be sent to an ad platform.",
    };
  }

  const age = daysBetween(lead.created_at, now);
  if (age > MAX_AGE_DAYS) {
    return {
      ...base,
      result: "ineligible",
      reason: `${age} days old. The import window is ${MAX_AGE_DAYS} days and the platform would reject it.`,
    };
  }

  if (lead.value === null) {
    return {
      ...base,
      result: "ineligible",
      reason:
        "No value set. Uploading a conversion worth nothing teaches the platform " +
        "to find more customers worth nothing — set the value on the lead first.",
    };
  }

  return { ...base, result: "eligible", reason: null };
}

/** RFC 4180: quote anything containing a comma, quote or newline. */
function csvCell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Google Ads' click-conversion import format.
 *
 * Times are ISO 8601 with an offset, which is what the importer expects; a
 * bare local time is the single most common reason an upload is rejected.
 */
export function toGoogleAdsCsv(
  rows: EvaluatedRow[],
  conversionActionName: string,
): string {
  const header = [
    "Google Click ID",
    "Conversion Name",
    "Conversion Time",
    "Conversion Value",
    "Conversion Currency",
  ];

  const lines = rows
    .filter((row) => row.result === "eligible")
    .map((row) =>
      [
        csvCell(row.click_id),
        csvCell(conversionActionName),
        csvCell(row.conversion_time ? new Date(row.conversion_time).toISOString() : null),
        csvCell(row.value),
        csvCell(row.currency),
      ].join(","),
    );

  return [header.join(","), ...lines].join("\r\n");
}
