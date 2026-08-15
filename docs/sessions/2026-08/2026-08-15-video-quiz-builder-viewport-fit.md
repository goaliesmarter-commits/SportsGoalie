# Session: Video Quiz Builder — Viewport Fit

**Date:** 2026-08-15
**Time Spent:** 3h
**Focus:** Bug Fix - Responsive Layout (Coach → Create Video Quiz)
**Block:** 2 Depth & Quality
**Commits:** `a0ae4ac`

---

## Goals

- [x] Cap the video player on `/coach/content/quiz/create` so it fits a 13" laptop screen
- [x] Video, transport controls, and the Add-Question area all visible together without scrolling
- [x] Hold the same standard on phone widths
- [x] Verify empirically rather than by eye

---

## Work Completed

### Root cause

Coach Mike (13" laptop) reported the player filling the whole viewport, pushing the controls and
the question form below the fold. The player boxes were plain full-width `aspect-video` divs. At
the page's container width that resolves to roughly a 1310×740 box — taller than the entire usable
area of a 1280×690 viewport, before counting the sticky header, the tab strip, the transport
controls and the sticky footer. Nothing was broken; the box simply had no height ceiling, and the
page has fixed chrome top and bottom.

### The fix — a width cap derived from viewport height (`app/globals.css`)

Rather than hard-code pixel heights per breakpoint, one utility caps the *width* so the
aspect-ratio-derived *height* can never exceed what's left after the surrounding UI:

```css
.video-fit-frame {
  width: 100%;
  margin-inline: auto;
  max-width: calc(max(7rem, 100svh - var(--video-chrome, 24rem)) * 16 / 9);
}
```

`--video-chrome` is the vertical budget the surrounding UI needs, set per usage site with a Tailwind
arbitrary property (`[--video-chrome:36rem]`). Two decisions worth recording:

- **The variable is read with a fallback, never declared in the rule.** It was declared initially,
  and the override silently lost: `.video-fit-frame` is unlayered, Tailwind v4's arbitrary
  properties live in `@layer utilities`, so the class-level declaration beat every per-site value.
  Measured computed styles showed `24rem` no matter what was passed. `var(--x, default)` is the
  form that actually accepts overrides here.
- **`svh` with a `vh` fallback**, declared twice, so mobile browser chrome doesn't inflate the budget.

Added a `short` variant for the same file — `@custom-variant short (@media (max-height: 900px))`.
Laptop pain here is vertical, not horizontal; a `sm:`/`md:` width breakpoint cannot express
"1440×720 is tight but 1440×1200 is fine". Every compaction in this session hangs off `short:`, so
nothing changes on a desktop monitor.

### Applied at the three player sites

- `VideoQuestionBuilder.tsx` — the Questions tab, Coach's actual blocker. Budget `36rem`, `28rem`
  when short. Card padding, control spacing and the play button compacted under `short:`; the
  helper line under the title hides. Control row switched to `flex-wrap` so it degrades to two rows
  on a phone instead of overflowing.
- `video-uploader.tsx` — both preview boxes (upload-success and URL). Budget `38rem` / `32rem`;
  its wrapper padding and tab strip compact under `short:`.
- `create/page.tsx` — page chrome trimmed under `short:` (header padding, eyebrow and subtitle
  hidden, title and icon smaller, tab spacing, footer padding), and the Video tab's blurb and
  library picker merged onto one row. This is what buys the capped player back its size: every rem
  reclaimed from chrome is ~1.8 rem of extra video width.

### Verification method

Guessing budgets from a design tool would not have caught the `--video-chrome` precedence bug. A
temporary unauthenticated route mirroring the real page chrome was driven with Playwright across
seven viewports, measuring the video box and the gap between the last essential control and the
sticky footer. Budgets were tuned until every case cleared. The harness and its scripts were
deleted afterwards; the fix is in the four files listed below and nothing else.

| Viewport | Questions tab | Video tab |
|---|---|---|
| 1280×690 (13" laptop) | video 430×242, **+31px** clear | +28px |
| 1366×600 | 270×152, +31px | +4px |
| 1440×720 | 484×272, +31px | +28px |
| 1920×950 | 665×374, +25px | +12px |
| 1920×1200 | 1109×624, +25px | +12px |
| 390×780 (phone) | 284×160, +121px | +115px |
| 360×640 (small phone) | 254×143, −2px | −12px |

No horizontal overflow at any size. The two small negatives at 360px wide are a width-bound case,
not a height one — the video is already as small as the column allows and the residual is a couple
of pixels of the footer's own padding. Hiding the volume slider there was tried and measured no
improvement, so it was reverted rather than kept as decoration.

---

## Files Created

| File | Purpose |
|------|---------|
| — | none (the temporary Playwright harness was deleted after measurement) |

## Files Modified

| File | Change |
|------|--------|
| `app/globals.css` | `.video-fit-frame` height-derived width cap; `short` custom variant |
| `src/components/admin/VideoQuestionBuilder.tsx` | Player capped (36/28rem); card, controls and play button compacted on short viewports; control row made wrap-safe |
| `src/components/coach/video-uploader.tsx` | Both preview frames capped (38/32rem); padding and tab strip compacted |
| `app/coach/content/quiz/create/page.tsx` | Header/footer/tab chrome trimmed under `short:`; Video-tab blurb and library picker merged onto one row |

---

## Verification

- [x] TypeScript compiles (`npx tsc --noEmit`, clean)
- [ ] Build passes — not run this session
- [x] Manual browser pass on the golden path (1280×690, Questions tab)
- [x] Manual browser pass on edge cases (7 viewports, both tabs, measured not eyeballed)
- [ ] Firestore rules deployed — n/a, no data surface touched

---

## Blockers

None. The fix is complete and uncommitted work is now committed.

---

## Next Steps

1. Deploy — production tracks `combined`, so pushing this branch ships it. Confirm with Michael
   which URL he is testing on before telling him it is fixed (see the standing PROJECT_TRACKER item).
2. `VideoUploader` is styled for a dark surface (`text-white/50`, `bg-white/5`) but renders on a
   white card on this page, so its "Upload Video" / "Video URL" tab labels are near-invisible when
   inactive. Pre-existing, unrelated to sizing, noticed in the verification screenshots. Worth a
   small follow-up.
3. Michael said more items are coming behind this one — expect them.

---

## Notes

`.video-fit-frame` is reusable. Any future full-width `aspect-video` box on a page with fixed chrome
should get it plus a `--video-chrome` budget rather than a new one-off `max-h-[...]`. The budget is
the only thing that needs measuring per context.

The recurring lesson from this one: an unlayered plain CSS rule silently outranks a Tailwind v4
utility, and the failure is invisible — the layout just quietly ignores the override. Reading
computed styles in the browser found it in a minute; reading the CSS did not.
