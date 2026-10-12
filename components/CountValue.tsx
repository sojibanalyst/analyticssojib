import { StatValue } from "@/components/StatValue";

/**
 * A figure that counts up, with whatever is around the number left alone.
 *
 * StatValue counts a bare number. Case-study figures are rarely bare: "61%",
 * "4.1x", "+37", "£31". This splits one into what comes before the number, the
 * number, and what comes after, and hands only the number to StatValue. So it
 * inherits every rule written there: it counts once, never rewinds a figure
 * already on screen, renders the final value on the server, and is read to a
 * screen reader once.
 *
 * A value with no number in it, or with more than one, is rendered verbatim.
 * Counting to something that is not a single settled figure would be inventing
 * precision the page does not have.
 */
const SHAPE = /^(\D*?)(\d+(?:\.\d+)?)(\D*)$/;

export function CountValue({ value }: { value: string }) {
  const match = SHAPE.exec(value.trim());
  if (!match) return <>{value}</>;

  const [, before, number, after] = match;
  return (
    <>
      {before}
      <StatValue value={number} />
      {after}
    </>
  );
}
