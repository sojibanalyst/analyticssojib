-- Three columns the reviews table needed once the real content met it.
--
-- P1 designed `reviews` from the brief. P2 migrated the actual data out of
-- content/site.ts and found three fields with nowhere to go. Adding them is
-- the honest fix; squeezing them into an existing column would have lost
-- meaning, and editing migration 2 is not allowed — it has run.

-- The accessible name of the play button ("Play client testimonial video 2").
-- It is not the title and not the quote: a screen-reader user hears this
-- instead of seeing the thumbnail, so it has to describe the control.
alter table public.reviews add column a11y_label text;

-- Written reviews carry one attribution string, e.g.
-- "Hannah R. · Skincare DTC · UK". Splitting it into name/company/country
-- would mean inventing structure the source does not have.
alter table public.reviews add column attribution text;

-- TRUE while a slot is still a labelled placeholder rather than a real
-- client's words. The site renders these differently on purpose, and nothing
-- may quietly present one as a genuine review.
alter table public.reviews add column is_placeholder boolean not null default false;

comment on column public.reviews.is_placeholder is
  'Placeholder text awaiting the real review. Never render as a genuine quote.';

-- A video review must say something. Either a named client with their own
-- words, or a neutral title describing the video — never an empty card.
alter table public.reviews
  add constraint reviews_video_needs_label
  check (type <> 'video' or a11y_label is not null);
