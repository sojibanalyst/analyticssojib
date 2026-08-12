import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAllowedEmail } from "@/lib/auth";
import { getUser } from "@/lib/supabase/server";
import { signOut } from "../actions";

/**
 * Everything behind the door.
 *
 * The (console) route group exists so /admin/login can stay outside this
 * layout — inside it, the guard below would redirect the login page to itself.
 * Route groups do not appear in URLs, so /admin is still /admin.
 *
 * The guard duplicates the middleware on purpose. Middleware is a redirect,
 * not an authorisation boundary: it can be bypassed by a misconfigured
 * matcher. This check, the middleware, and the RLS policies are three
 * independent layers, and the database one is the layer that actually holds.
 */
export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();

  if (!isAllowedEmail(user?.email)) {
    redirect("/admin/login");
  }

  return (
    <AdminShell
      email={user!.email!}
      signOut={
        <form action={signOut}>
          <button type="submit" className="admin-button" data-variant="ghost">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
