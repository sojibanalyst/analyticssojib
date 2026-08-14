/**
 * What every admin form action reports back.
 *
 * One shape for saves, creates and deletes, because the console shows them the
 * same way: a button that says what it is doing, and a line underneath that
 * says what happened. Before this, actions returned void — the fields looked
 * identical before and after a save, so people clicked Save twice.
 *
 * A plain module, not part of any `"use server"` file: everything a server
 * file exports becomes a callable endpoint, so a type or a constant there is a
 * build error rather than a style preference.
 */
export type ActionState = {
  status: "idle" | "ok" | "error";
  message: string;
};

export const ACTION_IDLE: ActionState = { status: "idle", message: "" };

export function ok(message: string): ActionState {
  return { status: "ok", message };
}

export function fail(message: string): ActionState {
  return { status: "error", message };
}

/** The reasons an action refuses, worded for the person reading them. */
export const ACTION_ERRORS = {
  notAllowed: "You are not signed in as an admin.",
  noId: "That item has no id, so there is nothing to change.",
  notConfirmed: "Tick Confirm first — nothing was deleted.",
  missingFields: "Fill in the required fields first.",
} as const;
