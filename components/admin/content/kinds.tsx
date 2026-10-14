"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

import { Switch, type Status } from "@/components/admin/ui/Basics";
import { ChipInput } from "@/components/admin/ui/ChipInput";
import { Group, Row, Segmented, TextArea, TextField } from "@/components/admin/content/fields";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import {
  QUOTE_SOFT_LIMIT,
  type CaseSection,
  type CaseStudyDraft,
  type ContentKind,
  type Draft,
  type FaqDraft,
  type PostDraft,
  type ProjectDraft,
  type ReviewDraft,
} from "@/lib/admin/editor";
import { toParagraphs } from "@/lib/post-body";

/* Rows as the server pages select them ------------------------------------- */

export type CaseRow = {
  id: string;
  slug: string;
  code: string;
  title: string;
  intro: string;
  body: string;
  tags: string[];
  status: "published" | "draft";
  needs_confirmation: boolean;
  metric_caption: string | null;
  metric_before_label: string | null;
  metric_after_label: string | null;
  metric_before: string | null;
  metric_after: string | null;
  metric_before_pct: number | null;
  metric_after_pct: number | null;
  detail_sections: unknown;
  updated_at: string;
  case_study_shots: { storage_path: string; alt_text: string; sort_order: number }[];
};

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  skills: string[];
  client: string | null;
  role: string | null;
  url: string;
  video_id: string | null;
  featured: boolean;
  published: boolean;
  images: unknown;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  type: "written" | "video";
  quote: string | null;
  attribution: string | null;
  rating: number | null;
  youtube_id: string | null;
  client_name: string | null;
  company: string | null;
  a11y_label: string | null;
  aspect_ratio: "portrait" | "landscape" | null;
  is_placeholder: boolean;
  published: boolean;
  updated_at: string;
};

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  topic: string;
  reading_time: string;
  status: "published" | "draft";
  is_draft: boolean;
  updated_at: string;
};

export type FaqRow = { id: string; question: string; answer: string; published: boolean; updated_at: string };

export type AnyRow = (CaseRow | ProjectRow | ReviewRow | PostRow | FaqRow) & { id: string; updated_at: string };

/* What the list shows ------------------------------------------------------- */

export type ListItem = {
  id: string;
  title: string;
  subtitle?: string;
  thumb?: string;
  status: Status;
  visible: boolean;
  needsCheck: boolean;
  imageCount?: number;
  updatedAt: string;
  siteHref?: string;
  featured?: boolean;
};

export type PortfolioImage = { src: string; alt: string; width: number; height: number };

export function imagesOf(value: unknown): PortfolioImage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (i): i is PortfolioImage =>
      !!i && typeof i.src === "string" && typeof i.width === "number" && typeof i.height === "number",
  );
}

const ytThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export function toListItem(kind: ContentKind, raw: AnyRow): ListItem {
  switch (kind) {
    case "case-studies": {
      const row = raw as CaseRow;
      const shots = [...(row.case_study_shots ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const visible = row.status === "published";
      return {
        id: row.id,
        title: row.title,
        subtitle: row.code,
        thumb: shots[0]?.storage_path,
        status: visible ? "published" : "draft",
        visible,
        needsCheck: row.needs_confirmation,
        imageCount: shots.length,
        updatedAt: row.updated_at,
        siteHref: visible ? `/case-studies/${row.slug}` : undefined,
      };
    }
    case "portfolio": {
      const row = raw as ProjectRow;
      const images = imagesOf(row.images);
      return {
        id: row.id,
        title: row.title,
        subtitle: row.skills.slice(0, 3).join(", "),
        thumb: images[0]?.src ?? (row.video_id ? ytThumb(row.video_id) : undefined),
        status: row.published ? "published" : "hidden",
        visible: row.published,
        needsCheck: false,
        imageCount: images.length,
        updatedAt: row.updated_at,
        siteHref: row.published ? `/work/${row.slug}` : undefined,
        featured: row.featured,
      };
    }
    case "reviews": {
      const row = raw as ReviewRow;
      const title =
        row.type === "video"
          ? [row.client_name, row.company].filter(Boolean).join(" · ") || "Video review"
          : row.attribution || "Written review";
      return {
        id: row.id,
        title,
        subtitle: row.type === "video" ? "Video" : (row.quote ?? "").slice(0, 90),
        thumb: row.type === "video" && row.youtube_id ? ytThumb(row.youtube_id) : undefined,
        status: row.is_placeholder ? "needs-check" : row.published ? "published" : "hidden",
        visible: row.published,
        needsCheck: row.is_placeholder,
        updatedAt: row.updated_at,
        siteHref: row.published ? "/reviews" : undefined,
      };
    }
    case "posts": {
      const row = raw as PostRow;
      const live = row.status === "published";
      return {
        id: row.id,
        title: row.title,
        subtitle: row.topic,
        status: !live ? "hidden" : row.is_draft ? "draft" : "published",
        visible: live,
        needsCheck: false,
        updatedAt: row.updated_at,
        siteHref: live ? `/blog/${row.slug}` : undefined,
      };
    }
    default: {
      const row = raw as FaqRow;
      return {
        id: row.id,
        title: row.question,
        subtitle: row.answer.slice(0, 90),
        status: row.published ? "published" : "hidden",
        visible: row.published,
        needsCheck: false,
        updatedAt: row.updated_at,
        siteHref: row.published ? "/services#faq" : undefined,
      };
    }
  }
}

/* Drafts -------------------------------------------------------------------- */

const UPWORK = "https://www.upwork.com/freelancers/conversiontrackinggtmga4looker";

function sectionsOf(value: unknown): CaseSection[] {
  if (!Array.isArray(value)) return [];
  return value.map((s) => ({
    heading: typeof s?.heading === "string" ? s.heading : "",
    paras: Array.isArray(s?.paras) ? s.paras.filter((p: unknown) => typeof p === "string") : [],
  }));
}

export function emptyDraft(kind: ContentKind, reviewType: "written" | "video" = "written"): Draft {
  switch (kind) {
    case "case-studies":
      return {
        title: "",
        code: "",
        intro: "",
        body: "",
        tags: [],
        status: "draft",
        needs_confirmation: true,
        metric_caption: "",
        metric_before_label: "Before",
        metric_after_label: "After",
        metric_before: "",
        metric_after: "",
        metric_before_pct: "",
        metric_after_pct: "",
        detail_sections: [],
      } satisfies CaseStudyDraft;
    case "portfolio":
      return {
        title: "",
        description: "",
        skills: [],
        client: "",
        role: "",
        url: UPWORK,
        video_id: "",
        featured: false,
        published: false,
      } satisfies ProjectDraft;
    case "reviews":
      return {
        type: reviewType,
        quote: "",
        attribution: "",
        rating: "5",
        youtube_id: "",
        client_name: "",
        company: "",
        a11y_label: "",
        aspect_ratio: "portrait",
        published: true,
      } satisfies ReviewDraft;
    case "posts":
      return {
        title: "",
        summary: "",
        topic: "NOTES",
        reading_time: "5 MIN",
        body: "",
        status: "draft",
        is_draft: true,
      } satisfies PostDraft;
    default:
      return { question: "", answer: "", published: true } satisfies FaqDraft;
  }
}

export function toDraft(kind: ContentKind, raw: AnyRow): Draft {
  switch (kind) {
    case "case-studies": {
      const r = raw as CaseRow;
      return {
        title: r.title,
        code: r.code,
        intro: r.intro,
        body: r.body,
        tags: r.tags ?? [],
        status: r.status,
        needs_confirmation: r.needs_confirmation,
        metric_caption: r.metric_caption ?? "",
        metric_before_label: r.metric_before_label ?? "",
        metric_after_label: r.metric_after_label ?? "",
        metric_before: r.metric_before ?? "",
        metric_after: r.metric_after ?? "",
        metric_before_pct: r.metric_before_pct === null ? "" : String(r.metric_before_pct),
        metric_after_pct: r.metric_after_pct === null ? "" : String(r.metric_after_pct),
        detail_sections: sectionsOf(r.detail_sections),
      };
    }
    case "portfolio": {
      const r = raw as ProjectRow;
      return {
        title: r.title,
        description: r.description,
        skills: r.skills ?? [],
        client: r.client ?? "",
        role: r.role ?? "",
        url: r.url,
        video_id: r.video_id ?? "",
        featured: r.featured,
        published: r.published,
      };
    }
    case "reviews": {
      const r = raw as ReviewRow;
      return {
        type: r.type,
        quote: r.quote ?? "",
        attribution: r.attribution ?? "",
        rating: r.rating === null ? "" : String(r.rating),
        youtube_id: r.youtube_id ?? "",
        client_name: r.client_name ?? "",
        company: r.company ?? "",
        a11y_label: r.a11y_label ?? "",
        aspect_ratio: r.aspect_ratio ?? "portrait",
        published: r.published,
      };
    }
    case "posts": {
      const r = raw as PostRow;
      return {
        title: r.title,
        summary: r.summary,
        topic: r.topic,
        reading_time: r.reading_time,
        body: (r.body ?? []).join("\n\n"),
        status: r.status,
        is_draft: r.is_draft,
      };
    }
    default: {
      const r = raw as FaqRow;
      return { question: r.question, answer: r.answer, published: r.published };
    }
  }
}

export function draftTitle(kind: ContentKind, draft: Draft): string {
  const d = draft as Record<string, unknown>;
  const value = kind === "faqs" ? d.question : kind === "reviews" ? d.attribution || d.client_name : d.title;
  return typeof value === "string" ? value : "";
}

/* Editors ------------------------------------------------------------------- */

type EditorProps<D> = {
  draft: D;
  set: <K extends keyof D>(key: K, value: D[K]) => void;
  errors: Record<string, string>;
  raw?: AnyRow;
};

export type Tabs = { key: string; label: string; content: React.ReactNode; badge?: string }[];

export function editorTabs(kind: ContentKind, props: EditorProps<Draft>): Tabs {
  switch (kind) {
    case "case-studies":
      return caseTabs(props as unknown as EditorProps<CaseStudyDraft>);
    case "portfolio":
      return projectTabs(props as unknown as EditorProps<ProjectDraft>);
    case "reviews":
      return reviewTabs(props as unknown as EditorProps<ReviewDraft>);
    case "posts":
      return postTabs(props as unknown as EditorProps<PostDraft>);
    default:
      return faqTabs(props as unknown as EditorProps<FaqDraft>);
  }
}

function caseTabs({ draft, set, errors, raw }: EditorProps<CaseStudyDraft>): Tabs {
  const shots = raw ? [...((raw as CaseRow).case_study_shots ?? [])].sort((a, b) => a.sort_order - b.sort_order) : [];
  const metricShown = draft.metric_before && draft.metric_after;
  return [
    {
      key: "content",
      label: "Content",
      content: (
        <>
          <TextField label="Title" required value={draft.title} onChange={(v) => set("title", v)} error={errors.title} />
          <TextArea
            label="Summary"
            hint="The paragraph on the case card."
            required
            rows={4}
            value={draft.body}
            onChange={(v) => set("body", v)}
            error={errors.body}
          />
          <TextArea
            label="Intro"
            hint="The first paragraph on the case study page."
            required
            rows={3}
            value={draft.intro}
            onChange={(v) => set("intro", v)}
            error={errors.intro}
          />
          <ChipInput label="Tags" value={draft.tags} onChange={(v) => set("tags", v)} />

          <Group title="Before and after">
            <Row>
              <TextField label="Before label" value={draft.metric_before_label} onChange={(v) => set("metric_before_label", v)} />
              <TextField label="After label" value={draft.metric_after_label} onChange={(v) => set("metric_after_label", v)} />
            </Row>
            <Row>
              <TextField label="Before value" hint="For example 61%" value={draft.metric_before} onChange={(v) => set("metric_before", v)} />
              <TextField label="After value" hint="For example 98%" value={draft.metric_after} onChange={(v) => set("metric_after", v)} />
            </Row>
            <Row>
              <TextField
                label="Before bar (0 to 100)"
                type="number"
                value={draft.metric_before_pct}
                onChange={(v) => set("metric_before_pct", v)}
                error={errors.metric_before_pct}
              />
              <TextField
                label="After bar (0 to 100)"
                type="number"
                value={draft.metric_after_pct}
                onChange={(v) => set("metric_after_pct", v)}
                error={errors.metric_after_pct}
              />
            </Row>
            <TextField label="Caption" value={draft.metric_caption} onChange={(v) => set("metric_caption", v)} />
            <div className="ax-preview">
              <p className="ax-preview__label">Preview, as on the site</p>
              {metricShown ? (
                <div className="ax-metric-preview">
                  <BeforeAfter
                    metric={{
                      caption: draft.metric_caption,
                      beforeLabel: draft.metric_before_label,
                      afterLabel: draft.metric_after_label,
                      before: draft.metric_before,
                      after: draft.metric_after,
                      beforePct: Number(draft.metric_before_pct) || 0,
                      afterPct: Number(draft.metric_after_pct) || 0,
                    }}
                  />
                </div>
              ) : (
                <p className="ax-field__hint">Fill in both values to see it. Without them the card shows no comparison.</p>
              )}
            </div>
          </Group>

          <SectionsEditor
            sections={draft.detail_sections}
            onChange={(v) => set("detail_sections", v)}
            errors={errors}
          />
        </>
      ),
    },
    {
      key: "media",
      label: "Media",
      badge: String(shots.length),
      content: <ShotGrid images={shots.map((s) => ({ src: s.storage_path, alt: s.alt_text }))} />,
    },
    {
      key: "settings",
      label: "Settings",
      content: (
        <>
          <TextField label="Code" hint="The label on the card, for example CASE_007 / SHOPIFY / UK" mono value={draft.code} onChange={(v) => set("code", v)} />
          <Switch
            label="Published on the site"
            checked={draft.status === "published"}
            onChange={(v) => set("status", v ? "published" : "draft")}
          />
          <Switch
            label="Figures unconfirmed"
            checked={draft.needs_confirmation}
            onChange={(v) => set("needs_confirmation", v)}
          />
          <p className="ax-field__hint">Turn this off once you have checked every number against the client&rsquo;s data.</p>
          {draft.status === "published" && draft.needs_confirmation ? (
            <p className="ax-warn" role="note">
              Live with unconfirmed figures. The site hides its &ldquo;reconciled&rdquo; claim until you confirm.
            </p>
          ) : null}
        </>
      ),
    },
  ];
}

/** Add, remove, reorder and edit the sections of a case study page. */
function SectionsEditor({
  sections,
  onChange,
  errors,
}: {
  sections: CaseSection[];
  onChange: (next: CaseSection[]) => void;
  errors: Record<string, string>;
}) {
  const update = (i: number, next: CaseSection) => onChange(sections.map((s, j) => (j === i ? next : s)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <Group title="Page sections">
      {sections.length === 0 ? <p className="ax-field__hint">No sections yet. The page shows only the intro.</p> : null}
      {sections.map((section, i) => (
        <div key={i} className="ax-section">
          <div className="ax-section__head">
            <span className="ax-section__n">Section {i + 1}</span>
            <div className="ax-section__tools">
              <button type="button" className="ax-iconbtn" aria-label={`Move section ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ax-iconbtn"
                aria-label={`Move section ${i + 1} down`}
                disabled={i === sections.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="ax-iconbtn"
                aria-label={`Remove section ${i + 1}`}
                onClick={() => onChange(sections.filter((_, j) => j !== i))}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <TextField
            label="Heading"
            value={section.heading}
            onChange={(v) => update(i, { ...section, heading: v })}
            error={errors[`detail_sections.${i}`]}
          />
          <TextArea
            label="Paragraphs"
            hint="Leave a blank line between paragraphs."
            rows={5}
            value={section.paras.join("\n\n")}
            onChange={(v) => update(i, { ...section, paras: v.split(/\n\s*\n/) })}
          />
        </div>
      ))}
      <button type="button" className="ax-btn" onClick={() => onChange([...sections, { heading: "", paras: [] }])}>
        <Plus size={15} aria-hidden="true" /> Add section
      </button>
    </Group>
  );
}

function projectTabs({ draft, set, errors, raw }: EditorProps<ProjectDraft>): Tabs {
  const images = raw ? imagesOf((raw as ProjectRow).images) : [];
  const videoId = /^[A-Za-z0-9_-]{11}$/.test(draft.video_id)
    ? draft.video_id
    : /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/.exec(draft.video_id)?.[1];
  return [
    {
      key: "content",
      label: "Content",
      content: (
        <>
          <TextField label="Title" required value={draft.title} onChange={(v) => set("title", v)} error={errors.title} />
          <TextArea
            label="Description"
            required
            rows={7}
            value={draft.description}
            onChange={(v) => set("description", v)}
            error={errors.description}
          />
          <ChipInput label="Skills" value={draft.skills} onChange={(v) => set("skills", v)} />
          <Row>
            <TextField label="Client" hint="Only if they are named elsewhere on the site." value={draft.client} onChange={(v) => set("client", v)} />
            <TextField label="Your role" value={draft.role} onChange={(v) => set("role", v)} />
          </Row>
        </>
      ),
    },
    {
      key: "media",
      label: "Media",
      badge: String(images.length),
      content: (
        <>
          <TextField
            label="Client video"
            hint="YouTube id or link."
            mono
            value={draft.video_id}
            onChange={(v) => set("video_id", v)}
            error={errors.video_id}
          />
          {videoId ? (
            <Image className="ax-ytthumb" src={ytThumb(videoId)} alt="Video thumbnail" width={320} height={180} />
          ) : null}
          <ShotGrid images={images} />
        </>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      content: (
        <>
          <Switch label="Published on the site" checked={draft.published} onChange={(v) => set("published", v)} />
          <Switch label="Featured on the homepage" checked={draft.featured} onChange={(v) => set("featured", v)} />
          <TextField label="Upwork link" type="url" mono value={draft.url} onChange={(v) => set("url", v)} error={errors.url} />
        </>
      ),
    },
  ];
}

function reviewTabs({ draft, set, errors }: EditorProps<ReviewDraft>): Tabs {
  const videoId = /^[A-Za-z0-9_-]{11}$/.test(draft.youtube_id)
    ? draft.youtube_id
    : /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/.exec(draft.youtube_id)?.[1];
  return [
    {
      key: "content",
      label: "Content",
      content: (
        <>
          <Segmented
            label="Type"
            value={draft.type}
            options={[
              { value: "written", label: "Written" },
              { value: "video", label: "Video" },
            ]}
            onChange={(v) => set("type", v)}
          />
          {draft.type === "written" ? (
            <>
              <TextArea
                label="Quote"
                hint="The client's own words, unedited."
                required
                rows={6}
                softLimit={QUOTE_SOFT_LIMIT}
                value={draft.quote}
                onChange={(v) => set("quote", v)}
                error={errors.quote}
              />
              <TextField
                label="Attribution"
                hint="For example: Hannah R. · Skincare DTC · UK"
                value={draft.attribution}
                onChange={(v) => set("attribution", v)}
              />
              <TextField
                label="Rating"
                hint="1 to 5. Leave empty if there is none."
                type="number"
                value={draft.rating}
                onChange={(v) => set("rating", v)}
                error={errors.rating}
              />
            </>
          ) : (
            <>
              <TextField
                label="YouTube video"
                hint="Paste the id or the link."
                required
                mono
                value={draft.youtube_id}
                onChange={(v) => set("youtube_id", v)}
                error={errors.youtube_id}
              />
              {videoId ? (
                <Image className="ax-ytthumb" src={ytThumb(videoId)} alt="Video thumbnail" width={320} height={180} />
              ) : null}
              <Row>
                <TextField label="Client name" value={draft.client_name} onChange={(v) => set("client_name", v)} />
                <TextField label="Company" value={draft.company} onChange={(v) => set("company", v)} />
              </Row>
              <TextField label="Title" hint="Read out by screen readers on the play button." value={draft.a11y_label} onChange={(v) => set("a11y_label", v)} />
              <Segmented
                label="Video shape"
                value={draft.aspect_ratio}
                options={[
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
                onChange={(v) => set("aspect_ratio", v)}
              />
            </>
          )}
        </>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      content: <Switch label="Published on the site" checked={draft.published} onChange={(v) => set("published", v)} />,
    },
  ];
}

function postTabs({ draft, set, errors }: EditorProps<PostDraft>): Tabs {
  return [
    {
      key: "content",
      label: "Content",
      content: (
        <>
          <TextField label="Title" required value={draft.title} onChange={(v) => set("title", v)} error={errors.title} />
          <TextArea label="Summary" rows={3} value={draft.summary} onChange={(v) => set("summary", v)} />
          <BodyEditor value={draft.body} onChange={(v) => set("body", v)} error={errors.body} />
        </>
      ),
    },
    {
      key: "settings",
      label: "Settings",
      content: (
        <>
          <Switch
            label="Live on the site"
            checked={draft.status === "published"}
            onChange={(v) => set("status", v ? "published" : "draft")}
          />
          <Switch label="Writing unfinished" checked={draft.is_draft} onChange={(v) => set("is_draft", v)} />
          <p className="ax-field__hint">An unfinished post keeps its URL but is marked draft and not indexed.</p>
          <Row>
            <TextField label="Topic" mono value={draft.topic} onChange={(v) => set("topic", v)} />
            <TextField label="Reading time" mono value={draft.reading_time} onChange={(v) => set("reading_time", v)} />
          </Row>
        </>
      ),
    },
  ];
}

/**
 * The post body with Write and Preview. The site shows a post as plain
 * paragraphs split on blank lines, so the preview does exactly that and no
 * more; Markdown would look formatted here and arrive as symbols there.
 */
function BodyEditor({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div className="ax-bodyed">
      <TextArea
        label="Body"
        hint="Leave a blank line between paragraphs."
        rows={12}
        value={value}
        onChange={onChange}
        error={error}
      />
      <div className="ax-preview">
        <p className="ax-preview__label">Preview, as on the site</p>
        <div className="ax-postpreview">
          {toParagraphs(value).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {!value.trim() ? <p className="ax-field__hint">Nothing written yet.</p> : null}
        </div>
      </div>
    </div>
  );
}

function faqTabs({ draft, set, errors }: EditorProps<FaqDraft>): Tabs {
  return [
    {
      key: "content",
      label: "Content",
      content: (
        <>
          <TextField label="Question" required value={draft.question} onChange={(v) => set("question", v)} error={errors.question} />
          <TextArea label="Answer" required rows={6} value={draft.answer} onChange={(v) => set("answer", v)} error={errors.answer} />
          <Switch label="Published on the site" checked={draft.published} onChange={(v) => set("published", v)} />
        </>
      ),
    },
  ];
}

/** The screenshots an item has. Upload, reorder and alt text come with the gallery manager. */
function ShotGrid({ images }: { images: { src: string; alt: string }[] }) {
  if (!images.length) return <p className="ax-field__hint">No screenshots yet.</p>;
  return (
    <ul className="ax-shots">
      {images.map((image) => (
        <li key={image.src} className="ax-shots__item">
          <Image src={image.src} alt={image.alt} width={240} height={150} sizes="240px" />
        </li>
      ))}
    </ul>
  );
}
