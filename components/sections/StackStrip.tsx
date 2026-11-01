import { toolGroups, toolsCopy } from "@/content/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ToolIcon } from "@/components/ui/Icon";

/** Where each group starts in the overall arrival order. */
const OFFSETS = toolGroups.map((_, g) => toolGroups.slice(0, g).reduce((n, group) => n + group.items.length, 0));

/**
 * The tools section, in four groups: analytics and tag management, advertising
 * measurement, reporting and diagnostics, platforms.
 *
 * It was one long row of every tool, which read as a list to skim past. In
 * groups a visitor finds their own stack in a glance. The official mark shows
 * where the project already carries it, in the text colour so the set reads
 * as one; everything else is a clean text label. Nothing here claims a
 * certification or a partnership.
 *
 * Each chip arrives in sequence when the section is scrolled to (the index is
 * a CSS custom property), and lifts with a lime edge on hover.
 */
export function StackStrip() {
  return (
    <section id="tools" aria-labelledby="tools-title" className="section tools">
      <SectionHeading eyebrow={toolsCopy.eyebrow} title={toolsCopy.title} titleId="tools-title" />
      <div className="tools__groups">
        {toolGroups.map((group, g) => (
          <div key={group.title} className="tools__group">
            <h3 className="tools__title">{group.title}</h3>
            <ul className="tools__list">
              {group.items.map((item, i) => (
                <li
                  key={item.label}
                  className="tools__chip"
                  style={{ "--i": Math.min(OFFSETS[g] + i, 20) } as React.CSSProperties}
                >
                  {item.icon ? (
                    <span className="tools__icon" aria-hidden="true">
                      <ToolIcon icon={item.icon} size={15} />
                    </span>
                  ) : null}
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
