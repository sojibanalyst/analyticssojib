import { Skeleton } from "@/components/admin/ui/Basics";

/** Shown while a console screen's server component reads the database. */
export default function Loading() {
  return (
    <div className="ax-loading">
      <span className="ax-loading__title" aria-hidden="true" />
      <Skeleton rows={8} label="Loading screen" />
    </div>
  );
}
