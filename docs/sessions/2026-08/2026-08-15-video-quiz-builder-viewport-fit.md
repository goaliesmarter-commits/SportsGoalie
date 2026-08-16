# Session: Video Quiz Builder — Viewport Fit

**Date:** 2026-08-15
**Time Spent:** 4h
**Focus:** Bug Fix - Responsive Layout + Contrast (Coach → Create Video Quiz)
**Block:** 2 Depth & Quality
**Commits:** `a0ae4ac`, `fe906fe`

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

### Follow-up in the same session — the invisible upload target (`fe906fe`)

The low-contrast uploader logged below as a "worth a follow-up" note turned out to be the next thing
reported, and it was worse than cosmetic. `VideoUploader` hard-codes white-on-dark colours
throughout. Five of its seven call sites are navy panels, where that is correct. The two coach
content pages render it inside a **white** shadcn `Card`, where `border-white/15` and `text-white`
resolve to invisible: the drop zone had no visible border *and* no visible instructions. The only
thing a coach could see was the active red **tab**, which is not a button — so there was no
discoverable way to start an upload at all. That is a dead end, not a contrast nit.

Fixed with a `surface` prop (`'dark' | 'light'`) driving a token map, defaulting to `dark` so the
five navy sites are untouched, and `surface="light"` passed at the two card sites. A repaint was
rejected for exactly that reason — the component genuinely lives on both surfaces.

Also strengthened the affordance, because "the whole box is clickable" was not readable even before
the contrast bug: the empty state now reads **"Click here to upload a video"**, carries an explicit
**Choose File** button, and is keyboard reachable (`role="button"`, `tabIndex`, Enter/Space, focus
ring).

That made the empty drop zone *taller* than the preview state it replaces, which broke the fit
shipped hours earlier in `a0ae4ac` — 1366×600 measured **−74px**. Caught only because the same
measurement was re-run rather than assumed. Compacted the empty state under `short:` (padding, icon,
and the two secondary lines merged into one) plus `max-sm:p-3`. Re-measured:

| Viewport | Slack below drop zone |
|---|---|
| 1280×690 | +100px |
| 1366×600 | +10px |
| 1440×720 | +130px |
| 1920×950 | +144px |
| 390×780 | +154px |
| 360×640 | −10px (marginally better than the −12 that state already had) |

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
| `app/coach/content/quiz/create/page.tsx` | Header/footer/tab chrome trimmed under `short:`; Video-tab blurb and library picker merged onto one row; `surface="light"` |
| `app/coach/content/quiz/[id]/edit/page.tsx` | `surface="light"` — same white card, same invisible drop zone |
| `src/components/coach/video-uploader.tsx` (2nd pass) | `surface` prop + token map; explicit "Click here to upload a video" / Choose File affordance; keyboard reachable; empty state compacted under `short:` / `max-sm:` |

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
2. ~~`VideoUploader` low contrast on the white card~~ — fixed in `fe906fe`, see above.
3. Audit the other five `VideoUploader` call sites the same way when convenient. They are on navy
   panels and were left on the `dark` default without being re-screenshotted this session.
4. Michael said more items are coming behind this one — expect them.

---

## Notes

`.video-fit-frame` is reusable. Any future full-width `aspect-video` box on a page with fixed chrome
should get it plus a `--video-chrome` budget rather than a new one-off `max-h-[...]`. The budget is
the only thing that needs measuring per context.

The recurring lesson from this one: an unlayered plain CSS rule silently outranks a Tailwind v4
utility, and the failure is invisible — the layout just quietly ignores the override. Reading
computed styles in the browser found it in a minute; reading the CSS did not.

Second lesson, from the follow-up: **a component with hard-coded surface colours is a latent bug at
every call site on the opposite surface.** `VideoUploader` shipped white-on-dark and was later
dropped onto white cards; nobody noticed because the failure mode is invisible content, not a
crash or a layout break. Worth grepping for other components carrying `text-white` / `bg-white/5`
that are used in more than one place — `VideoLibraryPicker` sits right next to this one on the
same card and is a candidate.

Third, procedural: adding to a layout that was just measured invalidates the measurement. Enlarging
the empty drop zone silently re-broke the 1366×600 fit from earlier the same day. Re-running the
measurement caught it; trusting the earlier green result would not have.
