import { SymptomsStory } from "@/components/symptoms/SymptomsStory";

/**
 * "Does this look familiar?" The section is a scroll story now, and all of it
 * lives in components/symptoms. This file stays so the page's list of sections
 * reads the same as it always has.
 */
export function Symptoms() {
  return <SymptomsStory />;
}
