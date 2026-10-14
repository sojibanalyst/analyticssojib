"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { deleteMediaFile, saveGallery, uploadMedia } from "@/app/(admin)/admin/(console)/media-actions";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/components/admin/ui/Toast";
import { mediaPathOf, type MediaItem, type MediaKind } from "@/lib/media";

const ACCEPT = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * The Media tab: upload, reorder, alt text, cover, remove.
 *
 * Upload stays disabled until the privacy check is ticked. Files are checked
 * here (PNG, JPG or WebP, 10 MB) and again on the server, then sent one at a
 * time; each shows a placeholder tile while it converts and stores.
 *
 * Gallery changes apply at once, separately from the editor's Save: drag a
 * tile (or use the arrow buttons), set a cover (moves it first), edit the alt
 * text (saved when you leave the field), remove. Removing takes the image off
 * this item only; deleting the file itself is a second, explicit choice.
 */
export function MediaManager({
  kind,
  id,
  initial,
  sections = [],
}: {
  kind: MediaKind;
  /** Null for an item that has not been saved yet. */
  id: string | null;
  initial: MediaItem[];
  /** Case studies: the page sections a screenshot can sit under. */
  sections?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>(initial);
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const [dragSrc, setDragSrc] = useState<string | null>(null);
  const [removing, setRemoving] = useState<MediaItem | null>(null);
  const [alsoFile, setAlsoFile] = useState(false);

  if (!id) {
    return <p className="ax-field__hint">Save this first, then add screenshots here.</p>;
  }

  const persist = async (next: MediaItem[], previous: MediaItem[], message?: string) => {
    setItems(next);
    const result = await saveGallery(kind, id, next);
    if (!result.ok) {
      setItems(previous);
      toast({ message: result.message, tone: "error" });
      return false;
    }
    if (message) {
      toast({
        message,
        undo: async () => {
          setItems(previous);
          const back = await saveGallery(kind, id, previous);
          if (back.ok) router.refresh();
        },
      });
    }
    router.refresh();
    return true;
  };

  const upload = async (files: FileList | File[]) => {
    const list = [...files];
    for (const file of list) {
      if (!ACCEPT.includes(file.type)) {
        toast({ message: `${file.name}: use PNG, JPG or WebP.`, tone: "error" });
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast({ message: `${file.name} is over 10 MB.`, tone: "error" });
        continue;
      }
      setPending((p) => [...p, file.name]);
      const form = new FormData();
      form.set("file", file);
      form.set("checked", "yes");
      const result = await uploadMedia(kind, id, form);
      setPending((p) => p.filter((name) => name !== file.name));
      if (!result.ok || !result.item) {
        toast({ message: result.message, tone: "error" });
        continue;
      }
      const item = result.item;
      setItems((all) => [...all, item]);
      toast({ message: result.message });
    }
    router.refresh();
  };

  const move = (src: string, to: number) => {
    const from = items.findIndex((i) => i.src === src);
    if (from < 0 || to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persist(next, items, to === 0 ? "Set as cover" : "Order saved");
  };

  const update = (src: string, patch: Partial<MediaItem>) =>
    setItems((all) => all.map((i) => (i.src === src ? { ...i, ...patch } : i)));

  const remove = async () => {
    if (!removing) return;
    const target = removing;
    const next = items.filter((i) => i.src !== target.src);
    setRemoving(null);
    const ok = await persist(next, items, alsoFile ? undefined : "Removed from this item");
    if (ok && alsoFile) {
      const result = await deleteMediaFile(target.src);
      toast({ message: result.ok ? "Removed and file deleted" : result.message, tone: result.ok ? "ok" : "error" });
    }
    setAlsoFile(false);
  };

  return (
    <div className="ax-media">
      <div className="ax-upload" data-over={over || undefined}>
        <label className="ax-check">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          Checked: no API keys, tokens, client emails, phone numbers or customer names visible.
        </label>

        <div
          className="ax-drop"
          data-disabled={!checked || undefined}
          onDragOver={(event) => {
            if (!checked || dragSrc) return;
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            if (!checked || dragSrc) return;
            event.preventDefault();
            setOver(false);
            void upload(event.dataTransfer.files);
          }}
        >
          <ImagePlus size={22} aria-hidden="true" />
          <p className="ax-drop__text">Drop screenshots here, or</p>
          <input
            ref={fileInput}
            id={inputId}
            type="file"
            accept={ACCEPT.join(",")}
            multiple
            className="sr-only"
            disabled={!checked}
            onChange={(event) => {
              if (event.target.files?.length) void upload(event.target.files);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            className="ax-btn"
            data-variant="primary"
            disabled={!checked}
            onClick={() => fileInput.current?.click()}
          >
            Choose files
          </button>
          <p className="ax-field__hint">PNG, JPG or WebP, up to 10 MB each. Saved as WebP, 1600px wide at most.</p>
        </div>
      </div>

      {items.length || pending.length ? (
        <ul className="ax-gallery" aria-label="Screenshots, first is the cover">
          {items.map((item, index) => (
            <li
              key={item.src}
              className="ax-gallery__item"
              draggable
              data-dragging={dragSrc === item.src || undefined}
              onDragStart={(event) => {
                setDragSrc(item.src);
                event.dataTransfer.setData("text/plain", item.src);
              }}
              onDragEnd={() => setDragSrc(null)}
              onDragOver={(event) => {
                if (dragSrc) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragSrc) move(dragSrc, index);
                setDragSrc(null);
              }}
            >
              <div className="ax-gallery__img">
                <Image src={item.src} alt="" width={320} height={200} sizes="240px" />
                {index === 0 ? <span className="ax-gallery__cover">Cover</span> : null}
              </div>
              <label className="ax-gallery__alt">
                <span className="sr-only">Alt text for image {index + 1}</span>
                <textarea
                  rows={2}
                  value={item.alt}
                  placeholder="Describe what the screenshot shows"
                  onChange={(event) => update(item.src, { alt: event.target.value })}
                  onBlur={() => void persist(items, items)}
                />
              </label>
              {kind === "case-studies" ? (
                <>
                  <label className="ax-gallery__alt">
                    <span className="sr-only">Caption for image {index + 1}</span>
                    <input
                      className="ax-input"
                      value={item.caption ?? ""}
                      placeholder="Caption under the image"
                      onChange={(event) => update(item.src, { caption: event.target.value })}
                      onBlur={() => void persist(items, items)}
                    />
                  </label>
                  <label className="ax-gallery__alt">
                    <span className="sr-only">Section for image {index + 1}</span>
                    <select
                      className="ax-input"
                      value={item.section ?? ""}
                      onChange={(event) => {
                        const next = items.map((i) => (i.src === item.src ? { ...i, section: event.target.value } : i));
                        void persist(next, items);
                      }}
                    >
                      <option value="">Not under a section</option>
                      {sections.map((heading) => (
                        <option key={heading} value={heading}>
                          Under: {heading}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <div className="ax-gallery__tools">
                <button
                  type="button"
                  className="ax-iconbtn"
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => move(item.src, index - 1)}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="ax-iconbtn"
                  aria-label={`Move image ${index + 1} later`}
                  disabled={index === items.length - 1}
                  onClick={() => move(item.src, index + 1)}
                >
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="ax-iconbtn"
                  aria-label={`Set image ${index + 1} as cover`}
                  disabled={index === 0}
                  onClick={() => move(item.src, 0)}
                >
                  <Star size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="ax-iconbtn"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => setRemoving(item)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
          {pending.map((name) => (
            <li key={`pending-${name}`} className="ax-gallery__item" aria-busy="true">
              <div className="ax-gallery__img ax-gallery__img--pending">
                <span className="ax-skeleton__bar" />
              </div>
              <p className="ax-field__hint">Uploading {name}...</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ax-field__hint">No screenshots yet.</p>
      )}

      <ConfirmDialog
        open={!!removing}
        title="Remove this screenshot?"
        body={
          removing && mediaPathOf(removing.src)
            ? "It comes off this item. The file stays unless you tick below."
            : "It comes off this item. The file stays in the site's code."
        }
        confirmLabel="Remove"
        onCancel={() => {
          setRemoving(null);
          setAlsoFile(false);
        }}
        onConfirm={() => void remove()}
      >
        {removing && mediaPathOf(removing.src) ? (
          <label className="ax-check ax-confirm__extra">
            <input type="checkbox" checked={alsoFile} onChange={(event) => setAlsoFile(event.target.checked)} />
            Also delete the file from storage
          </label>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
