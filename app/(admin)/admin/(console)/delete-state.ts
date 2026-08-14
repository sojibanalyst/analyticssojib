/**
 * What a delete action reports back.
 *
 * A plain module rather than part of content-actions.ts, because a
 * `"use server"` file may only export async functions — everything it exports
 * becomes a callable endpoint. Same reason LEAD_STATUSES lives apart from the
 * leads actions.
 */
export type DeleteState = {
  status: "idle" | "deleted" | "error";
  message: string;
};

export const DELETE_IDLE: DeleteState = { status: "idle", message: "" };

/**
 * The reasons a delete can refuse. Stated rather than returned silently: an
 * action that just returns is indistinguishable from a button that does not
 * work.
 */
export const DELETE_ERRORS = {
  notConfirmed: "Tick Confirm first — nothing was deleted.",
  noId: "That item has no id, so there is nothing to delete.",
  notAllowed: "You are not signed in as an admin.",
} as const;
