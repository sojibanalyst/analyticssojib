"use client";

/**
 * "Download as PDF" without shipping a headless-browser dependency or a static
 * file that goes stale the moment the page is edited: the print stylesheet
 * renders the document cleanly on A4 and Letter, and every browser's print
 * dialog offers "Save as PDF".
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="plan-download">
      {label}
    </button>
  );
}
