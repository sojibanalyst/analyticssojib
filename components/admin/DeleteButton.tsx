/**
 * Delete, behind a tick.
 *
 * The checkbox is the entire safety mechanism, and it is deliberately not a
 * JavaScript confirm(): this console works without JavaScript, and a native
 * dialog would be the one thing in it that does not. The server re-checks the
 * tick, so a form posted without it does nothing.
 */
export function DeleteButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action} className="admin-inline-form admin-danger">
      <input type="hidden" name="id" value={id} />
      <label className="admin-check">
        <input type="checkbox" name="confirm" />
        Confirm
      </label>
      <button type="submit" className="admin-button" data-variant="danger">
        {label}
      </button>
    </form>
  );
}
