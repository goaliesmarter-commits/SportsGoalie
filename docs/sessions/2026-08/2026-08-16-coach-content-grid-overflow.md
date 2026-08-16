# Session: Coach Content Library — Grid Overflow Fix

**Date:** 2026-08-16
**Time Spent:** 0.9h
**Focus:** Bug Fix - Responsive Layout (Coach → Content Library)
**Block:** 2 Depth & Quality
**Commits:** `8742095`

---

## Goals

- [x] Establish whether this session's other work touched `/coach/content` (it hadn't — a distinct, pre-existing bug)
- [x] Find why content cards get cut off on the right with no scrollbar at laptop widths
- [x] Fix it without touching unrelated pages that share the same CSS pattern

---

## Work Completed

### Root cause (`8742095`)

Coach Mike sent a screenshot of `/coach/content` with cards visibly cut off on the right edge,
no scrollbar, reading as "you broke this." `git log --name-only` across every commit from this
session (`a0ae4ac^..6208b1b`) confirmed none of them touched `app/coach/content/page.tsx`,
`app/coach/layout.tsx`, `LayoutShell.tsx`, or `CoachSidebar.tsx` — the only shared file this
session had changed was `app/globals.css`, and only via two new scoped classes plus a
`short:` variant, none of which this page references. Pre-existing bug, not a regression from
this branch's other fixes — worth saying plainly to Michael rather than just quietly fixing it.

The actual cause: `.content-grid` used bare `1fr` tracks —
`grid-template-columns: 1fr 1fr 1fr`. A CSS Grid track sized as `1fr` has an implicit
`min-width: auto`, meaning the browser will never shrink a track below the min-content width of
whatever's inside it — the same trap flex items fall into without `min-width: 0`. Below ~1440px
viewport width, the third column's cards needed more than an even three-way split, so that track
(and the cards in it) pushed 130px past the grid's own right edge, capping total content width at
a constant 1425.4px regardless of how much narrower the viewport got. A pre-existing (not this
session's) `html { overflow-x: hidden }` in `app/globals.css` swallowed the resulting overflow
silently instead of producing a scrollbar — which is exactly why it read as cards being "cut off"
rather than "needing a scroll."

First fix attempt was wrong and worth recording: added `min-width: 0` to `.content-grid` itself,
reasoning it was a flex item of the `flex-direction: column` `<main>` around it. Re-measured —
identical 1425.4px ceiling, no change. The container's own box was never the constrained thing;
its *children* (the grid items, one per card) were the ones defaulting to `min-width: auto` and
refusing to shrink below their own content. Fixed by swapping every `1fr` in the three
`grid-template-columns` declarations for `minmax(0, 1fr)`, which caps each track's minimum at 0
instead of at its content's min-content size.

### Verification method

Rather than touch the real Firestore-backed page (no coach test account exists in
`docs/internal/testing/testing-credentials.md`, and using real production accounts against real
data for a layout check is unnecessary risk), built an unauthenticated Playwright reproduction —
`CoachSidebar` + `LayoutShell`'s wrapper margins + the real page's JSX copied verbatim, static
dummy content in place of the Firestore call. First pass at this harness was itself wrong: it
skipped the `minWidth: 0` resets the real card markup sets on its title-wrapping divs, which
manufactured a false-positive overflow from the harness's own simplification, not from a real
bug. Re-copied the JSX byte-for-byte from source before trusting any measurement from it.

Swept 7 viewports (1280–1920px) before and after the fix:

| Viewport | Before | After |
|---|---|---|
| 1920×1040 | no overflow | no overflow |
| 1536×864 | no overflow | no overflow |
| 1440×900 | no overflow | no overflow |
| 1366×768 | **overflow, scrollWidth 1425 vs client 1366** | no overflow |
| 1280×800 | **overflow, scrollWidth 1425 vs client 1280** | no overflow |
| 1280×1024 | **overflow, scrollWidth 1425 vs client 1280** | no overflow |
| 1920×1200 | no overflow | no overflow |

`hasHScroll: false` at every size after the fix; wide-viewport layout unchanged (three even
columns, same as before).

---

## Files Created

| File | Purpose |
|------|---------|
| — | none (the Playwright reproduction page and diagnostic scripts were deleted after measurement) |

## Files Modified

| File | Change |
|------|--------|
| `app/coach/content/page.tsx` | `.content-grid` tracks: `1fr` → `minmax(0, 1fr)` at all three breakpoints |

---

## Verification

- [x] TypeScript compiles (`npx tsc --noEmit`, clean)
- [ ] Build passes — not run this session
- [x] Manual/scripted browser pass on the golden path and edge cases (7 viewports, measured not eyeballed)
- [ ] Firestore rules deployed — n/a, no data surface touched

---

## Blockers

None. Fix is complete and committed.

---

## Next Steps

1. Deploy — production tracks `combined`; this is not yet pushed (see standing PROJECT_TRACKER item on confirming Michael's test URL before pushing).
2. The same bare-`1fr` grid pattern exists on 9 other pages (`app/goals/page.tsx`,
   `app/progress/page.tsx`, `app/auth/accept-invite/page.tsx`, `app/onboarding/start/page.tsx`,
   `app/coach/students/page.tsx`, `app/profile/page.tsx`, `app/parent/profile/page.tsx`,
   `app/messages/page.tsx`, `app/coach/profile/page.tsx`). None were reported as broken and none
   were touched this session — flagging as a candidate follow-up, not fixing speculatively.
3. Tell Michael plainly: this bug predates this branch's other fixes and wasn't introduced by
   them (git-log evidence above), but it's fixed now regardless of origin.

---

## Notes

Same family of bug as flex's `min-width: auto` trap, just on the Grid axis: a `1fr` track and a
flex item both default to shrinking no further than their content's min-content size unless told
otherwise (`minmax(0, 1fr)` for a track, `min-width: 0` for a flex/grid item). The fix has to
target whichever one is actually doing the sizing — the first attempt here guessed the container
and was wrong; the element that needed the fix was the tracks themselves, one level down.

The pre-existing `html { overflow-x: hidden }` is doing real harm to bug reports: any future
horizontal overflow anywhere in the app will present the same way — content silently clipped,
no scrollbar, reads as "shoved off-screen" rather than "needs a scroll." Worth a conversation with
Michael about whether that rule should stay global or move to just the places it was added for.
