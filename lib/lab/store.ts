"use client";

import { labProduct, money, toItem, type CartLine } from "@/lib/lab/catalog";

/**
 * The lab's browser-side state and its one way of reporting: the dataLayer.
 *
 * Nothing here calls this site's collector or any platform. Events go to
 * window.dataLayer only, where a test GTM container loaded on the lab (and
 * nothing else) can read them. The cart lives in localStorage, the last order
 * in sessionStorage.
 */

const CART_KEY = "lab-cart";
const ORDER_KEY = "lab-last-order";
export const PUSH_EVENT = "lab:push";

type DataLayerWindow = Window & { dataLayer?: unknown[]; __labLog?: { at: string; payload: unknown }[] };

/** Records a push for the inspector, which may mount after the first one. */
function record(payload: unknown) {
  const w = window as DataLayerWindow;
  const entry = { at: new Date().toLocaleTimeString("en-GB"), payload };
  w.__labLog = [entry, ...(w.__labLog ?? [])].slice(0, 30);
  window.dispatchEvent(new CustomEvent(PUSH_EVENT, { detail: entry }));
}

/** The pushes made so far on this page, newest first. */
export function pushLog() {
  return (window as DataLayerWindow).__labLog ?? [];
}

/** Push an ecommerce event: clear the previous ecommerce object first, as GA4 asks. */
export function pushEcommerce(event: string, ecommerce: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  const payload = { event, event_id: crypto.randomUUID(), ...extra, ecommerce };
  w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push(payload);
  record(payload);
  return payload;
}

/** The same push again, as a replay: for practising deduplication. */
export function repush(payload: Record<string, unknown>) {
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push(payload);
  record(payload);
}

export function readCart(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((l) => labProduct(l?.slug) && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: CartLine[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(lines));
  } catch {
    // Storage blocked: the cart lasts for this page only.
  }
  window.dispatchEvent(new Event("lab:cart"));
}

export function cartItems(lines: CartLine[]) {
  return lines.map((line, index) => toItem(labProduct(line.slug)!, line.variant, line.quantity, index));
}

export function cartValue(lines: CartLine[]) {
  return money(lines.reduce((sum, line) => sum + labProduct(line.slug)!.price * line.quantity, 0));
}

export type LabOrder = {
  transaction_id: string;
  value: number;
  tax: number;
  shipping: number;
  shipping_tier: string;
  payment_type: string;
  items: ReturnType<typeof cartItems>;
  email: string;
  purchaseSent: boolean;
};

export function readOrder(): LabOrder | null {
  try {
    return JSON.parse(sessionStorage.getItem(ORDER_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function writeOrder(order: LabOrder) {
  try {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // Storage blocked: the thank-you page will show no order.
  }
}

/**
 * True the first time it is called with a key on this page load. Page-view
 * events (view_item, view_cart, begin_checkout) go through it, so a remount,
 * or React running an effect twice in development, cannot fire them twice.
 */
export function oncePerLoad(key: string): boolean {
  const w = window as Window & { __labOnce?: Set<string> };
  w.__labOnce = w.__labOnce ?? new Set();
  if (w.__labOnce.has(key)) return false;
  w.__labOnce.add(key);
  return true;
}
