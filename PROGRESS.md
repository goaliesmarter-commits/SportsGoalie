# PROGRESS TRACKING

> **MANDATORY**: This file MUST be updated at the end of every work session. Individual session details are stored in `docs/sessions/`.

---

## 📊 Project Status

**Current Phase:** Block 4 - Pillar Charting Engine (Blocks 1-3 largely delivered)
**Phase Start Date:** 2026-02-22
**Last Updated:** 2026-08-10
**Overall Progress:** Phase 2.0-2.2 Complete. Block 1 complete (7/7). Block 2 substantially complete (4/5). Block 3 partially delivered — parent/coach charting, video review, and Growth Points built; contextual support and learning portfolio not started.

> ⚠️ **This file was not updated between 2026-03-12 and 2026-08-03.** Five months of work happened without session logging. Sessions for that period were reconstructed from git history on 2026-08-03; see the note under Recent Sessions. The original targets above ("End of March 2026") were superseded without being rewritten — scope grew considerably beyond the March directive.

> ✅ **The former "immediate blocker" is resolved — it was never real.** This file claimed the
> 2026-08-02 Firestore rules and indexes were written but not deployed. Verified against the live
> `sportscoach-2a84d` project on 2026-08-10: all 24 declared indexes are present, and
> `firebase deploy --only firestore:rules` reported the deployed ruleset already matched the repo
> exactly. PROJECT_TRACKER.md had this right since 2026-08-03 ("Committed *and* deployed… the
> Firestore rules are live too"); this file simply went eight days without being reconciled
> against it. **When the two files disagree, trust PROJECT_TRACKER.md** — it is the one kept
> current. See Block 4 #19 below for the full detail.

### SOW Compliance Requirements
| Requirement | Frequency | Detail |
|-------------|-----------|--------|
| Progress updates | Twice weekly | Brief summary: work done, hours, next steps |
| SR&ED categorization | Every update | Tag each task as SR&ED-eligible or routine |
| Time logs | Every update | Date, description, feature reference, hours |
| Weekly work plan | Weekly | What you plan to work on the coming week |

---

## 🎯 Current Sprint Goals

> **Work Directive:** Per Michael's directive (2026-03-10), work follows Block 1 → Block 2 → Block 3 order.
> Do not skip ahead without written approval. See `client_data/Phase2/basim-work-directive-march10.md`

### Block 1: Launch Critical - COMPLETE
| # | Task | Est | Status | Delivered |
|---|------|-----|--------|-----------|
| 1 | Branding: SportsGoalie → Smarter Goalie | 2-3h | ✅ | 2026-03-12 |
| 2 | 7th Pillar: Add Lifestyle | 2h | ✅ | 2026-03-12 |
| 3 | Landing Page + Role Selection | 5-8h | ✅ | 2026-03-16, extended 2026-04-25 and 2026-07-27 |
| 4 | Video Database + Tagging System | 8-12h | ✅ | 2026-03-12, shared library added 2026-07-06 |
| 5 | Parent Dashboard + Child Linking | 10-15h | ✅ | 2026-03-12 |
| 6 | Dashboard Visualization + Integration | 4-6h | ✅ | 2026-08-02 (built as its own area, not a `/progress` tab — deviation not yet communicated to Michael) |
| 7 | Production Email (Resend) | 2-3h | ✅ | 2026-05-16 invitations, 2026-07-03 contact |

### Block 2: Depth & Quality - 4/5
| # | Task | Est | Status | Delivered |
|---|------|-----|--------|-----------|
| 8 | Questionnaire Alignment (84 assessment + 20 intake) | 3-5h | 🔲 | Not verified against specs |
| 9 | LMS Enhancements (content recommendations) | 5-8h | ✅ | 2026-06-14 (gap-driven recommendations + level enforcement) |
| 10 | Analytics Upgrades (trend views) | 5-8h | ✅ | 2026-06-21 charting analytics, 2026-08-02 baseline/growth |
| 11 | Mobile Polish | 3-5h | ✅ | 2026-06-30, 2026-07-01, 2026-07-16 |
| 12 | Bug Fixes + Iteration Buffer | 5-10h | 🔄 | Ongoing; well past the 5-10h estimate |

### Block 3: Experience Features - partially delivered
| # | Task | Status | Notes |
|---|------|--------|-------|
| 13 | Contextual Support System | 🔲 | `IntroOverlay` (2026-06-23) is a first-visit walkthrough, not the three-layer term support Michael specified |
| 14 | Milestone Recognition System | 🔄 | Growth Points built 2026-06-06/2026-06-22 — **has never awarded a point in production**, rules undeployed |
| 15 | Learning Portfolio | 🔲 | Not started |

> Additional Block 3 work delivered outside the original list: parent charting module, coach charting module, coach video review module, coach baseline questionnaire, L-Index catalogue, Seven Pillars public pages.

### Block 4: Pillar Charting Engine (Active) - per Michael's charting brief
| # | Task | Status |
|---|------|--------|
| 16 | `(sport, pillar)` concurrency scoping | ✅ 2026-08-02 |
| 17 | Baseline + growth analytics | ✅ 2026-08-02 |
| 18 | Pillar dashboard | ✅ 2026-08-02 |
| 19 | Deploy rules + indexes | ✅ 2026-08-10 — verified already live, see note below |
| 20 | Multi-URL deployment diagnostic | ✅ 2026-08-03 — result in PROJECT_TRACKER.md "Deployment Topology" |
| 21 | Live-data testing | 🔲 2.5h billed — **no longer blocked**, nothing stands in its way |

> **#19 correction (2026-08-10).** This sat marked 🚨 Blocking since 2026-08-02 and it was
> wrong. Checked against the live `sportscoach-2a84d` project: all 24 indexes in
> `firestore.indexes.json` are deployed, including the three added in `bba4c15`, and
> `firebase deploy --only firestore:rules` reported *"latest version of firestore.rules
> already up to date, skipping upload"* — the deployed ruleset already matched the repo
> byte for byte. Both halves had been live for some time. Nothing was ever blocked on
> Firebase, and the 2026-08-02 claim that production was "serving a non-deterministic form"
> did not hold.
>
> Consequence: the standing theory that standalone pillar check-ins were being rejected
> because the old rule required `sessionId` is **dead** — that relaxation is live. Whether
> anything is actually broken in the pillar track is now an open question that only #21 can
> answer. Do not assume it works, and do not assume it doesn't.
>
> Also found while listing: the live project holds **34 composite indexes that are absent
> from `firestore.indexes.json`**, covering `quiz_attempts`, `quizzes`, `skills`, `sports`,
> `users`, `notifications`, `playlists`, `content`, `chat_sessions`, `coach_invitations`,
> four more on `form_templates`, and — critically — `dynamic_charting_entries` and
> `dynamic_charting_analytics`. `firebase deploy --only firestore:indexes --force` would
> delete every one of them (verified in `firebase-tools` 15.12.0, `lib/firestore/api.js:85`;
> without `--force` it prompts, defaulting to No). No data would be lost, but quiz history,
> the skill/sport listings, the admin user list and the pillar analytics would all break
> until the indexes rebuilt. **Never deploy indexes with `--force` against this project**
> until the file is reconciled with what is live.
| 22 | MindSet / Skating / Form templates | 🔲 Blocked on Michael's checkpoint wording |
| 23 | Net Orientation, Game Performance, Practice, Lifestyle | 🔲 Blocked — no content from Michael |

### Completed Foundation
- [x] Multi-Role Foundation (Phase 2.0) - COMPLETE
- [x] 6-Pillar Framework (Phase 2.1) - COMPLETE
- [x] Intelligence-Based Onboarding (Phase 2.2) - COMPLETE
- [x] System Analysis for Michael (2026-03-10)

---

## 📅 Recent Sessions

> **Full session details:** See `docs/sessions/YYYY-MM/` for detailed session logs
>
> ⚠️ **Sessions dated 2026-03-16 through 2026-07-27 were reconstructed on 2026-08-03 from git history.** Session logging lapsed for five months while development continued. Times in those entries are **estimates from commit scope, not measurements**. Where a contemporaneous work-log document existed (`docs/work-log-apr17-may15-2026.md`, `docs/development-log-may31-jun24.md`), its figures were used and the source is named in the session file. The 2026-08-02 entry is logged first-hand.

### 2026-08-02 - [Concurrent Pillar Charting Engine](docs/sessions/2026-08/2026-08-02-concurrent-pillar-charting-engine.md)
**Time:** 10h 30min | **Focus:** Feature - Charting Engine / Bug Fixes | **Block:** 4
Scoped form-template concurrency by `(sport, pillar)` compound key, replacing the one-globally-active-template model that made MindSet/Skating/combined charts mutually exclusive. Replaced both broken deactivation methods with `deactivateTemplatesInScope()`. Added baseline tracking to analytics (first submission pins the baseline, computed from full history not the filtered window). Central `toDateSafe` in `src/lib/utils/timestamp.ts` fixing the mangled-Firestore-timestamp crash at source. Wrote the missing Growth Points security rules and fixed the `.finally()`/`.catch()` that swallowed every permission denial. Backfill dry run reported 0 documents needing update. ~~**Rules and indexes not yet deployed — production is serving a non-deterministic form until they are.**~~ **Superseded 2026-08-10:** both were verified live against `sportscoach-2a84d`. Either they were deployed shortly after this session and the note was never updated, or it was wrong when written. Left visible rather than deleted, because this line is what kept #19 flagged as blocking for eight days.

### 2026-07-27 - [Seven Pillars Public Pages + Explore More](docs/sessions/2026-07/2026-07-27-seven-pillars-pages-and-explore-more.md)
**Time:** 12h | **Focus:** Feature - Public Pillars / UI | **Block:** 3
`app/7-pillars/page.tsx` (641 lines) and `app/pillar/[id]/page.tsx` (1,035 lines) public pillar surface, `ExploreMoreSection`, `SevenPillarsCTA`, `hero-shader.tsx`, and `pillar-public-routes.ts` so pillar links generate from one source. ScrollStack sticky positioning fixed for larger screens. Admin user role menu moved onto the shared shadcn `DropdownMenu`.

### 2026-07-20 - [Landing Toolbox + Chatbot Model Version](docs/sessions/2026-07/2026-07-20-landing-toolbox-and-model-version.md)
**Time:** 3h | **Focus:** UI - Landing / Maintenance - AI | **Block:** 2
Toolbox section refined on the landing page. Anthropic model ID updated in both call sites (`app/api/chatbot/route.ts`, `src/lib/ai/claude.service.ts`) — still duplicated across two files.

### 2026-07-16 - [Invite Validation + Layout Overflow](docs/sessions/2026-07/2026-07-16-invite-validation-and-layout-overflow.md)
**Time:** 4h | **Focus:** Bug Fixes - Invitations / Layout | **Block:** 2
Invitation accept flow now validates expired tokens, already-accepted invites, and invite/account email mismatch with clear reporting instead of failing at the write. Added `_inspect-overflow.js`, a console diagnostic that walks the DOM reporting elements wider than their container, and fixed the mobile horizontal-scroll sources it identified.

### 2026-07-07 - [Baseline Save Reliability + Auth Fixes](docs/sessions/2026-07/2026-07-07-baseline-save-reliability-and-auth-fixes.md)
**Time:** 4h | **Focus:** Bug Fixes - Baseline / Auth | **Block:** 2
Coach baseline questionnaire could fail to persist silently, losing a completed assessment; save path made reliable with surfaced errors. Fixed the password show/hide toggle rendering invisible against the browser autofill background.

### 2026-07-06 - [Invitations, Admin Invite Management, Video Library](docs/sessions/2026-07/2026-07-06-invitations-admin-and-video-library.md)
**Time:** 11h | **Focus:** Feature - Invitations / Video Library | **Block:** 3
Fixed two silent invitation bugs: coach invite emails never sent, and a role race condition on accept. Built `AdminInviteForm`/`AdminInviteList` (+600) so invitations can be inspected, re-sent, and revoked. Shared video library (15 files, +790): `video-library.service.ts`, `VideoLibraryPicker`, `video-source.ts` normalising YouTube/Vimeo/direct uploads, plus `storage.rules` with role validation.

### 2026-07-03 - [Contact Form Wiring](docs/sessions/2026-07/2026-07-03-contact-form-wiring.md)
**Time:** 3h | **Focus:** Feature - Contact / Email | **Block:** 2
The contact form previously validated then discarded submissions. New `app/api/contact/route.ts` writes the enquiry to Firestore first, then sends via Resend, so a delivery failure leaves a recoverable record. `email.service.ts` +133.

### 2026-07-01 - [Mobile Responsiveness + Baseline Scores](docs/sessions/2026-07/2026-07-01-mobile-responsiveness-and-baseline-scores.md)
**Time:** 4h | **Focus:** Responsive / Feature - Baseline Scores | **Block:** 2
Continued the mobile pass. Surfaced baseline intelligence-profile scores to goalie, parent, and coach — previously admin-only — with +36 lines of `firestore.rules` granting the three roles read access.

### 2026-06-30 - [Public Navigation, User Deletion, Mobile Pass](docs/sessions/2026-06/2026-06-30-navigation-and-mobile-responsiveness.md)
**Time:** 4h | **Focus:** Navigation / Admin - User Management | **Block:** 2
Delete-user API route removing the Firebase Auth record alongside the Firestore document, so deletion no longer leaves an orphaned auth account blocking re-registration. `PublicPageNav` extended to remaining public routes, `ScrollStack.css` added, pricing/register/accept-invite reworked for narrow viewports.

### 2026-06-24 - [Coach Video Review Module](docs/sessions/2026-06/2026-06-24-coach-video-review-module.md)
**Time:** 10h 30min | **Focus:** Feature - Video Review / Refactor | **Block:** 3
Video review across three roles: coach hub (585 lines), read-only per-goalie videos tab (256), goalie-facing records page (165). Admin modal gained an analysis timer with start/pause/resume/save-session and auto-save on close; `video-review.service.ts` stores per-session durations and recalculates the cumulative total. Terminology per Coach Mike's brief (Mind Control → Emotional Balance, Good Decision % → Good Decision Factor, intermediate → Development, Anxiety Present → Pre-Game Stress). `PublicPageNav` and `Footer7` extracted, replacing per-page inline navs across 10 pages — net 244-line reduction.

### 2026-06-23 - [6 Zone Grid Rename + Intro Overlay](docs/sessions/2026-06/2026-06-23-six-zone-grid-rename-and-intro-overlay.md)
**Time:** 4h | **Focus:** Terminology / Feature - Coach Onboarding | **Block:** 2
"7 Point System" → "6 Zone Grid" and "Bad Goal" → "Weak Goal" across 31 files. `IntroOverlay` first-visit walkthrough for coaches, plus `app/coach/charting/[goalieId]/page.tsx` (284 lines) listing a goalie's sessions with chart status.

### 2026-06-22 - [Growth Points System](docs/sessions/2026-06/2026-06-22-growth-points-system.md)
**Time:** 11h | **Focus:** Feature - Growth Points / Charting Flow | **Block:** 3
`growth-points.service.ts` (153 lines) with transaction-safe awarding and ledger writes, `useGrowthPoints` hook, award triggers on the three post-game charting variants plus lessons and quiz results, balance on the dashboard. Parent chart flow overhauled with emoji options, a `SectionLabel` component, and **auto-save replacing manual save buttons** throughout. **Note: Growth Points has never awarded a point in production — the security rules were never written. Fixed 2026-08-02, still undeployed.**

### 2026-06-21 - [Blue Design System + Parent & Coach Charting](docs/sessions/2026-06/2026-06-21-blue-design-system-and-parent-coach-charting.md)
**Time:** 44h | **Focus:** Feature - Parent/Coach Charting / Design System | **Block:** 3
The largest work block on the project. Public pages rebranded off CYAN/MINT/VIOLET/CORAL onto blue (9 files, +3,077/-968) including a 553-line Bridge page, `ToolboxSection`, and `PillarsArchitectureSection` (524 lines). Full parent chart module (7 files, +1,776) — session list, 3-step hub with lock/unlock, pre-game, P1/P2/P3 star ratings with observation multi-select, post-game with mood-driven coaching tips. Full coach chart module (6 files, +1,209) — 955-line form with 7 rating factors per period. V2 Cross-Reference rewritten for three-role comparison. Fixed a timestamp parsing bug treating millisecond values as seconds.

### 2026-06-14 - [Build Fixes, L-Index, Blue Admin Theme](docs/sessions/2026-06/2026-06-14-build-fixes-l-index-and-blue-theme.md)
**Time:** 13h 30min | **Focus:** Build / Feature - L-Index / Design System | **Block:** 2
Two rounds of Vercel build failures resolved — missing carousel components, undeclared `@react-three` dependencies, missing barrel exports, and React 19 `LucideIcon` typing (restored twice more during merge conflict resolution). L-Index catalogue: 529-line admin CRUD page with category filtering plus Firestore rules for `l_index_items`/`training_logs`. `ContentBrowser` pre-filtered to the student's assessed pacing level with an off-level warning. Admin routes moved onto a dedicated blue `adminBg`.

### 2026-06-12 - [Coach Baseline Questionnaire](docs/sessions/2026-06/2026-06-12-coach-baseline-questionnaire.md)
**Time:** 15h | **Focus:** Feature - Coach Assessment | **Block:** 3

### 2026-06-11 - [Public Overview Redesign](docs/sessions/2026-06/2026-06-11-public-overview-redesign.md)
**Time:** 4h | **Focus:** UI - Public Pages | **Block:** 2

### 2026-06-07 - [Coach Panel + Parent UI Overhaul](docs/sessions/2026-06/2026-06-07-coach-panel-and-parent-ui-overhaul.md)
**Time:** 27h | **Focus:** Feature - Coach Panel / Parent UI | **Block:** 3

### 2026-06-06 - [Coach Onboarding + Growth Points Foundation](docs/sessions/2026-06/2026-06-06-coach-onboarding-and-growth-points-foundation.md)
**Time:** 11h | **Focus:** Feature - Coach Onboarding / Growth Points | **Block:** 3

### 2026-05-31 - [Language Lock Pass](docs/sessions/2026-05/2026-05-31-language-lock-pass.md)
**Time:** 8h | **Focus:** Terminology / Copy | **Block:** 2

### 2026-05-20 - [Admin Redesign](docs/sessions/2026-05/2026-05-20-admin-redesign.md)
**Time:** 14h | **Focus:** UI - Admin | **Block:** 2

### 2026-05-16 - [Invite Email Delivery + Pricing Page](docs/sessions/2026-05/2026-05-16-invite-email-delivery-and-pricing-page.md)
**Time:** 6h | **Focus:** Email / UI - Pricing | **Block:** 1

### 2026-05-15 - [Goalie Invitation System](docs/sessions/2026-05/2026-05-15-goalie-invitation-system.md)
**Time:** 9h | **Focus:** Feature - Invitations | **Block:** 1

### 2026-05-10 - [Animated Backgrounds + Pillar Pages](docs/sessions/2026-05/2026-05-10-animated-backgrounds-and-pillar-pages.md)
**Time:** 10h 15min | **Focus:** UI - Public Pages | **Block:** 1

### 2026-04-25 - [Public Role Pages](docs/sessions/2026-04/2026-04-25-public-role-pages.md)
**Time:** 8h | **Focus:** Feature - Public Pages | **Block:** 1

### 2026-04-23 - [Video Quiz Progress Tracking](docs/sessions/2026-04/2026-04-23-video-quiz-progress-tracking.md)
**Time:** 3h 30min | **Focus:** Feature - Progress Tracking | **Block:** 2

### 2026-04-20 - [Goalie Charting History + V2 Read-Only](docs/sessions/2026-04/2026-04-20-goalie-charting-history-and-v2-readonly.md)
**Time:** 11h 30min | **Focus:** Feature - Charting | **Block:** 2
Includes `565e5dc` — the **earliest instance of the mangled-timestamp bug**, patched locally into `CalendarHeatmap` rather than centrally. The same class of bug resurfaced in June and again in August; the central fix (`toDateSafe`) only landed 2026-08-02.

### 2026-04-19 - [Lesson Service + Skill Detail](docs/sessions/2026-04/2026-04-19-lesson-service-and-skill-detail.md)
**Time:** 11h | **Focus:** Feature - LMS | **Block:** 2

### 2026-04-17 - [Charting Performance + Admin Styling](docs/sessions/2026-04/2026-04-17-charting-performance-and-admin-styling.md)
**Time:** 15h 15min | **Focus:** Performance / UI - Admin | **Block:** 2

### 2026-04-16 - [Code Structure Refactor](docs/sessions/2026-04/2026-04-16-code-structure-refactor.md)
**Time:** 4h 30min | **Focus:** Refactor | **Block:** 2

### 2026-04-10 - [Skeleton Loading States](docs/sessions/2026-04/2026-04-10-skeleton-loading-states.md)
**Time:** 4h | **Focus:** UI - Loading States | **Block:** 2

### 2026-04-08 - [Analytics + Route Handling](docs/sessions/2026-04/2026-04-08-analytics-and-route-handling.md)
**Time:** 6h | **Focus:** Analytics / Routing | **Block:** 2

### 2026-04-04 - [UI Pass: Quizzes, Lessons, Enrollment](docs/sessions/2026-04/2026-04-04-ui-pass-quizzes-lessons-enrollment.md)
**Time:** 6h 30min | **Focus:** UI | **Block:** 2

### 2026-04-03 - [Student Intelligence Sidebar + Lessons](docs/sessions/2026-04/2026-04-03-student-intelligence-sidebar-and-lessons.md)
**Time:** 7h | **Focus:** Feature - Coach Tools / LMS | **Block:** 2

### 2026-04-02 - [Mind Vault Form + Admin Pillars](docs/sessions/2026-04/2026-04-02-mind-vault-form-and-admin-pillars.md)
**Time:** 4h | **Focus:** Feature - Mind Vault | **Block:** 2

### 2026-03-31 - [Voice Input + Coach Role](docs/sessions/2026-03/2026-03-31-voice-input-and-coach-role.md)
**Time:** 10h | **Focus:** Feature - Voice Input / Coach Role | **Block:** 1

### 2026-03-22 - [Parent Onboarding Flow](docs/sessions/2026-03/2026-03-22-parent-onboarding-flow.md)
**Time:** 5h | **Focus:** Feature - Parent Onboarding | **Block:** 1

### 2026-03-19 - [Admin Layout + Parent Linking](docs/sessions/2026-03/2026-03-19-admin-layout-and-parent-linking.md)
**Time:** 4h 30min | **Focus:** UI - Admin / Feature - Parent Linking | **Block:** 1
Includes `7221dda` and `c2f1ede`, which untracked 67 client session documents (~10,000 lines) under the `docs/` gitignore rule — the point at which the session-logging practice stopped.

### 2026-03-18 - [Layout Shell + Planning Docs](docs/sessions/2026-03/2026-03-18-layout-shell-and-planning-docs.md)
**Time:** 7h | **Focus:** UI - Layout / Planning | **Block:** 1

### 2026-03-16 - [Landing Page + Club Intro](docs/sessions/2026-03/2026-03-16-landing-page-club-intro.md)
**Time:** 5h | **Focus:** Feature - Landing Page | **Block:** 1

### 2026-03-12 - [Test Import Path Fixes](docs/sessions/2026-03/2026-03-12-test-import-path-fixes.md)
**Time:** 1h 30min | **Focus:** Testing / Bug Fix - Import Path Resolution | **Block:** Testing
Fixed incorrect import path aliases (@/src/* → @/*) in 8 source files causing 80 test failures. Updated sports-catalog.test.tsx and sports-detail.test.tsx for 7-pillar system UI. Simplified auth context tests to avoid Vitest act()+rejects incompatibility. Fixed type errors in service tests. Results: 347 tests passing (was 346), 11 test files still failing (pre-existing component mocking issues). TypeScript and build verified.

### 2026-03-12 - [Parent Dashboard + Child Linking](docs/sessions/2026-03/2026-03-12-parent-dashboard-child-linking.md)
**Time:** 4h 30min | **Focus:** Feature - Parent-Child Account Linking | **Block:** 1.5
Implemented complete parent-child account linking system. Created parent-link.ts with ParentLink, LinkedChildSummary, LinkedParentSummary, ParentCrossReferenceView types. Built ParentLinkService with generateParentLinkCode(), linkParentToChild(), getLinkedChildren(), getLinkedParents(), revokeLink() methods. Created ParentDashboard with stats cards and tabs, ChildProgressCard, LinkChildForm with XXXX-XXXX code validation, CrossReferenceDisplay for perception comparison. Added ParentLinkManager to goalie settings for code generation and parent management. Created 5 parent routes: dashboard, link-child, child/[childId], child/[childId]/assessment, onboarding. Added tooltip.tsx component. Build verified.

### 2026-03-12 - [Video Database + Tagging System](docs/sessions/2026-03/2026-03-12-video-tagging-system.md)
**Time:** 2h 30min | **Focus:** Feature - Video Content Filtering | **Block:** 1.4
Implemented structured tagging system for video content filtering. Created video-tags.ts with PillarTag, SystemTag (7AMS/7PTS/4LAS/Box/General), UserTypeTag (goalie/parent/coach), AngleMarkerTag (AM1-AM7), ArchLevelTag (L1-L4). Added structuredTags and _tagIndex fields to VideoQuiz. Updated VideoQuizService with getVideoQuizzesByTags(), getTagFacets(), updateTagIndex() methods. Created VideoTagEditor and VideoFilterPanel components. Integrated into admin quiz create/edit pages (new Tags tab). Added filter panel and tag badges to admin quizzes list. Build verified.

### 2026-03-12 - [Add 7th Pillar: Lifestyle](docs/sessions/2026-03/2026-03-12-add-7th-pillar-lifestyle.md)
**Time:** 45min | **Focus:** Feature - Pillar System | **Block:** 1.2
Added Lifestyle as the 7th pillar covering off-ice habits, nutrition, recovery, sleep, and life balance. Updated type definitions (PillarSlug, PILLARS array), utility files (PILLAR_IDS, pink color classes), seed data, migration script. Added Heart icon to UI components. Updated "6 pillars" → "7 pillars" text across pillars page, admin page, dashboard, and test files. Ran migration to create pillar_lifestyle in database. Build verified, pushed to remote.

### 2026-03-12 - [Branding Update: Smarter Goalie](docs/sessions/2026-03/2026-03-12-branding-update-smarter-goalie.md)
**Time:** 2h 30min | **Focus:** Branding / Documentation | **Block:** 1.1
Complete branding update across 42 files. Updated package.json name (sportscoach-v3 → smarter-goalie), all user-facing metadata, AI system prompts, README/CLAUDE.md/TESTING.md, Docker infrastructure, planning docs, technical architecture docs, client documentation, internal documentation, test files, and service comments. Build verified, pushed to remote.

### 2026-03-11 - Work Directive Integration
**Time:** 30min | **Focus:** Planning / Documentation
Integrated Michael's Work Directive (2026-03-10) into PROGRESS.md. Replaced Phase 2.3-2.6 structure with Block 1/2/3 priority system. Key changes: added 7th pillar (Lifestyle), 8-role landing page, video tagging system, parent dashboard. Block 3 introduces experience features (Contextual Support, Milestones, Portfolio). Added SOW compliance requirements and admin configuration notes.

### 2026-03-10 - [System Analysis for Michael](docs/client/sessions/2026-03-10-system-analysis-for-michael.md)
**Time:** 30min | **Focus:** Documentation / Analysis
Comprehensive system analysis documenting existing charting, questionnaire, scoring, and analytics systems. Verified: Legacy charting (5-Pillar, database-backed), Dynamic charting (full admin UI for creating any chart type), 84 assessment questions (28 per role, complete), 1.0-4.0 scoring engine, 6 cross-reference rules. Hour estimates: 5-10 hrs for dashboard/integration work, +8-10 hrs optional for admin question editing UI. Most systems are fully built.

### 2026-03-07 - [Reset Incomplete Evaluations Script](docs/sessions/2026-03/2026-03-07-reset-incomplete-evaluations-script.md)
**Time:** 15min | **Focus:** Migration / Data Cleanup
Created one-time migration script to reset incomplete or old onboarding evaluations. Script detects stuck (in_progress) and pre-V2 (no assessment responses) evaluations, deletes them, and resets user onboarding flags. Executed script: reset 4 evaluations (1 active user, 3 orphaned).

### 2026-03-07 - [Add Detailed Q&A View to Evaluation Page](docs/sessions/2026-03/2026-03-07-evaluation-qa-detail-view.md)
**Time:** 15min | **Focus:** Feature - Coach/Admin UI Enhancement
Added collapsible "Assessment Responses" section to coach evaluation page showing individual questions and answers from student onboarding assessments. Displays question codes, text, selected answers, and color-coded score badges grouped by category.

### 2026-03-07 - [Fix Onboarding Redirect for Students](docs/sessions/2026-03/2026-03-07-fix-onboarding-redirect-for-students.md)
**Time:** 15min | **Focus:** Bug Fix - Authentication
Fixed login page to redirect students who haven't completed onboarding to `/onboarding` instead of `/dashboard`. Updated redirect logic in login page to check `onboardingCompleted` for students. Prevents race condition where students briefly see dashboard before being redirected.

### 2026-03-07 - [Remove Onboarding V2 Backward Compatibility](docs/sessions/2026-03/2026-03-07-remove-onboarding-v2-backward-compatibility.md)
**Time:** 30min | **Focus:** Refactor / Code Cleanup
Removed all V2 backward compatibility code from onboarding system. Renamed component files (removed -v2 suffix), removed type aliases (AssessmentResponseV2, OnboardingEvaluationV2), removed legacy functions (getLevelDisplayText, getLevelColor), removed legacy fields (overallLevel, overallPercentage), removed service method aliases. Net removal of ~2,259 lines. All tests pass.

### 2026-03-07 - [Fix Custom Quiz Not Found Bug](docs/sessions/2026-03/2026-03-07-fix-custom-quiz-not-found.md)
**Time:** 15min | **Focus:** Bug Fix - Quiz Access
Fixed "Video quiz not found" error when students click "Take Quiz" on custom content items. Custom content uses `content_xxx` IDs that reference actual quiz IDs in `video_quizzes` collection. Updated quiz page to resolve custom content references before loading quiz.

### 2026-03-07 - [Email Verification Branding](docs/sessions/2026-03/2026-03-07-email-verification-branding.md)
**Time:** 30min | **Focus:** Feature - Email Infrastructure
Added Resend email integration infrastructure for branded verification emails. Created verification email templates with "Smarter Goalie" branding, API endpoint for custom emails, and updated email service. Using Firebase's built-in verification for now (no domain); Resend code ready for Phase B when domain is purchased.

### 2026-03-07 - [V2 Onboarding UI Fixes](docs/sessions/2026-03/2026-03-07-v2-onboarding-ui-fixes.md)
**Time:** 30min | **Focus:** Bug Fix / UI Improvement
Fixed V2 onboarding UI proportions to match old styling: enlarged progress dots, removed max-width constraint on options, added letter badges (A,B,C,D), increased icon sizes in progress bar. Fixed critical bug where assessment questions got stuck after answering - added key prop to force component remount on question change.

### 2026-03-06 - [Phase D Goalie Onboarding V2 UI](docs/sessions/2026-03/2026-03-06-phase-d-goalie-onboarding-v2-ui.md)
**Time:** 1h 30min | **Focus:** Feature - Onboarding UI Integration
Integrated V2 scoring system (1.0-4.0 scale, 7 categories) into goalie onboarding flow. Created useOnboardingV2 hook with phases (welcome, intake, bridge, category_intro, question, profile, complete). Built 8 new V2 components: WelcomeScreenV2, IntakeScreen, BridgeMessage, CategoryIntro, AssessmentQuestionV2, OnboardingProgressV2, IntelligenceProfileView. Added V2 service methods for intake/assessment response handling and profile generation. Replaced main onboarding page with V2 flow.

### 2026-03-06 - [Michael's Phase 2 Scoring Foundation](docs/sessions/2026-03/2026-03-06-michaels-phase2-scoring-foundation.md)
**Time:** 2h 0min | **Focus:** Feature - Phase 2 Scoring System
Implemented Phases A, B, and C of Michael's Phase 2 specification integration. Created new scoring system with 1.0-4.0 continuous scale and 7 categories per role. Built goalie/parent/coach intake questions (4 screens each) and assessment questions (28 per role). Created intelligence profile scoring engine with weighted categories, gap/strength analysis, and pacing level mapping. Built cross-reference engine for comparing goalie/parent/coach assessments with alignment and gap detection.

### 2026-03-06 - [Navigation Cleanup](docs/sessions/2026-03/2026-03-06-navigation-cleanup.md)
**Time:** 20min | **Focus:** UI/UX - Navigation
Renamed "Courses" to "Pillars" in top navigation. Removed "Quizzes" link (students encounter quizzes during studies). Removed "Dashboard" link (redundant - students access pillars and progress directly). Cleaner student nav: Pillars, Progress, Charting, Messages.

### 2026-03-05 - [Service Unit Tests Implementation](docs/sessions/2026-03/2026-03-05-service-unit-tests-implementation.md)
**Time:** 1h 0min | **Focus:** Testing - Unit Tests
Created comprehensive unit tests for 4 critical database services: CustomCurriculumService (43 tests), CustomContentService (40 tests), OnboardingService (30 tests), EnrollmentService (20 tests). Total 133 new tests, all passing. Fixed Timestamp mock in test setup to support instanceof checks. Service test coverage significantly improved.

### 2026-03-05 - [Test Files Pillar Route Update](docs/sessions/2026-03/2026-03-05-test-files-pillar-route-update.md)
**Time:** 45min | **Focus:** Testing - Phase 2.1d Test File Updates
Updated 5 test files with /sports → /pillars route changes. Fixed test assertions to match actual UI ("Ice Hockey Goalie Pillars" title). Fixed strict mode violations and timeout issues. All 19 sports-workflows.spec.ts tests pass on chromium. TypeScript and build verified.

### 2026-03-05 - [Route Renaming (sports to pillars)](docs/sessions/2026-03/2026-03-05-route-renaming-sports-to-pillars.md)
**Time:** 30min | **Focus:** Refactor - Phase 2.1c Route Renaming
Renamed URL routes from `/sports` to `/pillars` to complete terminology alignment. Renamed directories (app/sports → app/pillars, app/admin/sports → app/admin/pillars, tests). Updated 14 files with internal link changes. Updated middleware public routes. Updated test import paths. TypeScript and build verified.

### 2026-03-05 - [6-Pillar Conversion](docs/sessions/2026-03/2026-03-05-6-pillar-conversion.md)
**Time:** 1h 30min | **Focus:** Feature - Phase 2.1 6-Pillar Conversion
Converted platform from generic sports/courses to fixed 6 Ice Hockey Goalie pillars. Created pillar utilities (src/lib/utils/pillars.ts) with ID mappings, color classes, and helpers. Updated seed data, student-facing pages (sports catalog, detail, dashboard), and admin pages (pillar management, skills). Removed create/delete for pillars (fixed set). Created and executed migration script - deleted 22 old sports, created 6 pillars, reassigned 12 skills and 15 video quizzes. TypeScript and build verified.

### 2026-03-04 - [Onboarding Redirect Fix & Workflow Filter](docs/sessions/2026-03/2026-03-04-onboarding-redirect-fix-workflow-filter.md)
**Time:** 45min | **Focus:** Bug Fix / Feature
Fixed redirect loop between /onboarding and /dashboard after completing onboarding. Added onboarding fields to auth context user object. Added refreshUser() method to auth context for post-update refresh. Added workflow filter tabs to coach students page (All/Custom/Automated) with workflow type badges. Updated cleanup script and deleted test user account.

### 2026-03-04 - [Codebase Verification & Bug Fixes](docs/sessions/2026-03/2026-03-04-codebase-verification-bug-fixes.md)
**Time:** 30min | **Focus:** Code Quality / Bug Fix
Comprehensive codebase audit before Phase 2.1. Fixed missing .catch() handler in coach-breadcrumb.tsx promise chain. Replaced `any` types with proper TypeScript types in LegacyChartingForm.tsx. Fixed Playwright port configuration from 3001 to 3000. Removed redundant port override in test file. TypeScript and build verification passed. All fixes committed and pushed.

### 2026-03-04 - [Onboarding Rules & Coach UX Improvements](docs/sessions/2026-03/2026-03-04-onboarding-rules-and-coach-ux.md)
**Time:** 1h 0min | **Focus:** Security / Testing / Refactor
Deployed Firestore security rules for onboarding_evaluations collection. Created Playwright test suite verifying authentication, welcome screen, and dark theme. Enhanced VideoUploader with Google Drive support and flexible props for reuse. Added CoachBreadcrumb component and Content Library nav link. Refactored admin quiz pages to use shared VideoUploader (-700 lines). Fixed video MIME types. Deleted deprecated quiz-creator dialog. All changes pushed to remote.

### 2026-03-04 - [Student Onboarding Evaluation System](docs/sessions/2026-03/2026-03-04-student-onboarding-evaluation-system.md)
**Time:** 2h 30min | **Focus:** Feature - Phase 2.0.7 Student Onboarding
Implemented complete student onboarding evaluation system with 27 questions across 6 Ice Hockey Goalie Pillars. Created immersive full-screen flow with dark theme, auto-progress saving, and resume capability. Built question types: rating scales (1-5), multiple choice, true/false, video scenarios. Added automatic level calculation (beginner/intermediate/advanced), coach review page with level adjustment, and dashboard redirect guard. Created 17 new files including types, service layer, hooks, and UI components.

### 2026-03-04 - Dead Code Cleanup & TypeScript Fixes
**Time:** 45min | **Focus:** Refactor / Code Quality
Removed ~8,200+ lines of dead code: backup directories (components_backup/, lib_backup/), unused video player components (VideoQuizPlayer, VideoQuizPlayerV2, SimpleVideoQuizPlayer), orphaned hooks/services (useVideoQuiz.ts, mock-data.service.ts, icon-picker.tsx), legacy files (page.legacy.tsx, firestore.rules.backup). Fixed all TypeScript errors in test files (converted Jest→Vitest API, fixed Firebase mocks) and source files (logger spread types, Zod schemas, service return types). Improved video uploader to load immediately and detect duration for YouTube/Vimeo.

### 2026-03-04 - [Security Audit & Critical Fixes](docs/sessions/2026-03/2026-03-04-security-audit-and-fixes.md)
**Time:** 1h 15min | **Focus:** Security / Code Quality / Dependencies
Addressed critical security vulnerabilities: sanitized exposed Firebase credentials in .env.example (API keys, private key), removed hardcoded admin setup secret fallback, removed dangerous typescript.ignoreBuildErrors, moved testing libraries to devDependencies, updated Next.js 16.1.4→16.1.6 (3 CVE fixes), hardened storage.rules for video-quizzes uploads. All verifications pass (npm audit: 0 vulns, type-check: clean, build: success).

### 2026-03-04 - [Video Handling System Verification & MIME Type Fixes](docs/sessions/2026-03/2026-03-04-video-handling-system-verification.md)
**Time:** 30min | **Focus:** Verification / Bug Fix
Verified video handling system implementation from analysis plan - found all major features (ReactPlayer for YouTube/Vimeo, URL detection, info messages) already implemented. Fixed legacy storage rules with correct MIME types (removed invalid `video/mov`, added `video/x-msvideo` for AVI, `video/x-ms-wmv` for WMV). TypeScript compilation verified clean.

### 2026-03-04 - [Video Quiz Full-Page Conversion & UI/UX Improvements](docs/sessions/2026-03/2026-03-04-video-quiz-full-page-conversion.md)
**Time:** 2h 0min | **Focus:** Feature / UI/UX / Bug Fix
Converted video quiz creator from cramped dialog to full-page layout with tab-based navigation. Improved True/False question type with visual toggle buttons instead of dropdown. Redesigned Fill in the Blank with split input approach (before/after fields) eliminating manual blank placement. Fixed multiple Firestore issues: skipped sport validation for coach content, updated rules for isCoachOrAdmin(), removed orderBy to avoid composite index requirement.

### 2026-03-02 - [Custom Content Student Access Fixes](docs/sessions/2026-03/2026-03-02-custom-content-student-access-fixes.md)
**Time:** 2h 15min | **Focus:** Bug Fix - Student Access
Fixed critical issues preventing students from accessing custom lessons. Updated curriculum sorting (unlocked before locked). Fixed Firestore rules for public read. Discovered and fixed view count increment blocking students (was requiring write permission). Created custom lesson viewer page with YouTube embed support. Students can now access coach-created lessons.

### 2026-03-01 - [Coach Custom Content Creation System](docs/sessions/2026-03/2026-03-01-coach-custom-content-creation.md)
**Time:** 3h 30min | **Focus:** Feature - Coach Content Creation
Implemented complete coach custom content creation system with full feature parity to admin quiz creation. Created video upload component, lesson creator, quiz creator (3-step wizard with VideoQuestionBuilder), content type selector, and coach content library page. Added "My Content" tab to content browser and "Create Custom Content" button to curriculum editor. Updated Firestore rules for coach video quiz permissions. Build verified successful.

### 2026-02-28 - [Custom Curriculum Progress Tracking](docs/sessions/2026-02/2026-02-28-custom-curriculum-progress-tracking.md)
**Time:** 1h 45min | **Focus:** Feature / Bug Fix
Implemented progress tracking for custom workflow students. Added recordLessonCompletion method and Mark Complete button for lessons. Fixed static method context issues in CustomCurriculumService. Fixed Firestore security rules to allow students to update their own curriculum items.

### 2026-02-28 - [Curriculum Fixes & Difficulty Level Renaming](docs/sessions/2026-02/2026-02-28-curriculum-fixes-difficulty-levels.md)
**Time:** 2h 30min | **Focus:** Bug Fix / Refactor / Migration
Fixed curriculum creation and content loading errors. Renamed difficulty levels to Introduction/Development/Refinement across 22+ files. Created and executed data migration (48 documents updated). Fixed content browser dialog overflow. Updated admin dashboard link to go directly to all students view.

### 2026-02-27 - [Coach Invitation Auth Fixes](docs/sessions/2026-02/2026-02-27-coach-invitation-auth-fixes.md)
**Time:** 1h 30min | **Focus:** Debugging / Bug Fix - Coach Invitation Authentication
Fixed critical auth issues in coach invitation flow. Resolved race condition between onAuthStateChanged listener and registration. Discovered code path discrepancy between student and coach registration. Implemented skipEmailVerification for invited coaches (clicking link IS verification). Updated Firestore rules and login flow to check Firestore emailVerified field.

### 2026-02-26 - [Coach-Student Linking & Dashboard Separation](docs/sessions/2026-02/2026-02-26-coach-student-linking-dashboard-separation.md)
**Time:** 1h 15min | **Focus:** Feature - Coach-Student Direct Linking & Dashboard Differentiation
Implemented Phase 2.0.3 coach-student direct linking with 4 new UserService methods, StudentSearchDialog component, and add/remove functionality on coach students page. Created CustomCurriculumDashboard component for custom workflow students. Dashboard now shows different experience based on student workflowType.

### 2026-02-25 - [Session Tracking Dashboard](docs/sessions/2026-02/2026-02-25-session-tracking-dashboard.md)
**Time:** 1h 45min | **Focus:** Feature - Development Progress Dashboard
Added session tracking panel to Project Assistant page. Shows phase progress (60%), total sessions count, features built, and recent sessions list. Handled Vercel deployment constraints by using static data approach. Integrated into sidebar of admin project assistant page.

### 2026-02-24 - [Project Assistant AI Chatbot](docs/sessions/2026-02/2026-02-24-project-assistant-chatbot.md)
**Time:** 2h 30min | **Focus:** Feature - AI Chatbot with Project Knowledge
Built complete AI-powered project assistant for admin dashboard. Created client documentation system (docs/client/) with 7 comprehensive files. Implemented ProjectAssistantService with smart context loading. Built chat API with Anthropic Claude Sonnet 4 integration. Created chat interface with markdown rendering and code highlighting. Integrated into admin dashboard. Build verified successful.

### 2026-02-23 - [Full Content Browser for Curriculum Builder](docs/sessions/2026-02/2026-02-23-curriculum-builder-content-browser.md)
**Time:** 1h 30min | **Focus:** Feature - Content Browser UI Enhancement
Built comprehensive content browser component to replace placeholder system. Implemented real data loading from database (sports, skills, quizzes). Added search, filtering, and preview functionality. Enhanced curriculum display with actual content titles. Created scroll-area component. Build verified successful.

### 2026-02-23 - [Admin Access to Curriculum Management](docs/sessions/2026-02/2026-02-23-admin-curriculum-access.md)
**Time:** 30min | **Focus:** Feature - Admin Curriculum Access
Extended coach curriculum management features to admins. Admins can now view and manage any student's custom workflow. Updated navigation, page titles, and filtering logic. Build verified successful.

### 2026-02-24 - [Phase 2.0.6: Student Workflow Types & Coach Curriculum Builder MVP](docs/sessions/2026-02/2026-02-24-phase-2-0-6-workflow-types-mvp.md)
**Time:** 6h 0min | **Focus:** Feature - Student Workflow Types with Custom Curriculum System (MVP)
Implemented complete student workflow type system (automated vs custom). Built CustomCurriculumService and CustomContentService with full CRUD operations. Created coach UI with dashboard, student list, and curriculum builder. Added workflow selection to registration flow. Implemented comprehensive Firestore security rules. MVP fully functional and tested.

### 2026-02-22 - [Phase 2.0.2: Coach Invitation System](docs/sessions/2026-02/2026-02-22-phase-2-0-2-coach-invitation-system.md)
**Time:** 3h 15min | **Focus:** Feature - Coach Invitation & Email System + Production Deployment
Built complete coach invitation system with email-based invitations, admin UI, token validation, acceptance flow, and email service infrastructure. Deployed to production with Firestore security rules and fixed data validation issues.

### 2026-02-22 - [Phase 2.0.1b: Student IDs & Security](docs/sessions/2026-02/2026-02-22-phase-2-0-1b-student-ids-security.md)
**Time:** 1h 30min | **Focus:** Feature - Student ID System & Security
Implemented crypto-random student ID generation (SG-XXXX-XXXX). Restricted public registration to Student/Parent only. Added profile display with copy functionality.

### 2026-02-22 - [Phase 2.0.1: Multi-Role Extension](docs/sessions/2026-02/2026-02-22-phase-2-0-1-multi-role-extension.md)
**Time:** 2h 15min | **Focus:** Feature - Multi-Role Authentication
Extended user roles to support Coach and Parent. Updated registration flow, admin UI, and all auth-related components.

### 2026-02-22 - [Progress Tracking Restructure](docs/sessions/2026-02/2026-02-22-progress-tracking-restructure.md)
**Time:** 30 min | **Focus:** Documentation / Organization
Restructured progress tracking with individual session files for better scalability.

### 2026-02-22 - [Branding Integration](docs/sessions/2026-02/2026-02-22-branding-integration.md)
**Time:** 15 min | **Focus:** Version Control / Branding
Cherry-picked and applied branding changes from feature branches to master.

### 2026-02-22 - [Progress Tracking Setup](docs/sessions/2026-02/2026-02-22-progress-tracking-setup.md)
**Time:** 45 min | **Focus:** Documentation & Analysis
Initial project analysis and progress tracking system implementation.

---

## 📈 Time Tracking Summary

### By Phase
| Phase | Time Spent | Status |
|-------|-----------|--------|
| Phase 1 | ~160 hours (estimated) | ✅ Complete |
| Phase 2 | 413.5 hours | 🔄 In Progress |
| **Total** | **~573.5 hours** | - |

> **Phase 2 = 58h logged (Feb 17 – Mar 12) + 355.5h reconstructed (Mar 13 – Aug 2).** The reconstructed portion is estimated from commit scope and from two contemporaneous work-log documents; it is not a measured time log. Treat it as an order-of-magnitude record of effort, not as a billing source.

### By Category (Phase 2)
| Category | Time Spent | Percentage |
|----------|-----------|------------|
| Development (features) | 265h | 64% |
| UI / Design System | 68h | 16% |
| Debugging / Bug Fixes | 42h | 10% |
| Refactor | 14h | 3% |
| Documentation | 12.25h | 3% |
| Build / Infrastructure | 8h | 2% |
| Testing | 2.5h | <1% |
| Security | 1.5h | <1% |
| Version Control | 0.25h | <1% |
| **Total** | **413.5h** | **100%** |

> Category split for the reconstructed period is apportioned from each session's Focus label, not from per-task records. The pre-2026-03-13 figures are the original logged ones.

### Weekly Summary
| Week Starting | Hours Worked | Main Focus | Sessions |
|--------------|--------------|------------|----------|
| 2026-02-17 | 26h | Multi-role system, student IDs, security, coach invitations, workflow types, curriculum builder, content browser, AI chatbot, session tracking, coach-student linking, dashboard separation, auth fixes, curriculum fixes, difficulty level renaming, data migration | 14 |
| 2026-03-01 | 31.5h | Coach custom content creation, student access fixes, video quiz full-page conversion, UI/UX improvements, video handling verification, security audit & fixes, dead code cleanup, TypeScript fixes, student onboarding evaluation system, Firestore rules, Playwright testing, coach UX improvements, codebase verification & bug fixes, onboarding redirect fix, workflow filter, 6-pillar conversion, route renaming, test file updates, navigation cleanup, Michael's Phase 2 scoring foundation, V2 onboarding UI fixes, email verification branding, V2 backward compatibility removal, login redirect fix, evaluation Q&A detail view, reset incomplete evaluations script, branding update, 7th pillar (Lifestyle), video tagging system, parent dashboard + child linking, test import path fixes | 26 |

### Monthly Summary (2026-03-13 onward — reconstructed)
| Month | Hours | Main Focus | Sessions |
|-------|-------|------------|----------|
| 2026-03 (from 13th) | 31.5h | Landing page, layout shell, admin layout, parent onboarding, voice input, coach role | 5 |
| 2026-04 | 81.25h | Mind Vault, coach intelligence sidebar, LMS lessons, analytics, skeletons, charting performance, charting history + V2 read-only, public role pages | 11 |
| 2026-05 | 47.25h | Animated backgrounds, pillar pages, goalie invitations, email delivery, pricing, admin redesign, language lock | 5 |
| 2026-06 | 144h | Coach onboarding, coach panel, baseline questionnaire, L-Index, blue design system, parent + coach charting modules, Growth Points, video review | 10 |
| 2026-07 | 41h | Mobile responsiveness, baseline scores, contact form, invitations + admin invite management, video library, invite validation, Seven Pillars public pages | 7 |
| 2026-08 (to 2nd) | 10.5h | Concurrent pillar charting engine, baseline analytics, timestamp fix, Growth Points rules | 1 |
| **Total** | **355.5h** | - | **39** |

---

## 🎯 Milestone Tracking

### Phase 2 Milestones

#### 2.0 - Multi-Role Foundation (100% Complete) ✅
- [x] 2.0.1: Extended user roles (Student, Coach, Parent, Admin)
- [x] 2.0.2: Student ID system & registration security
- [x] 2.0.3: Coach invitation system with email infrastructure
- [x] 2.0.4: Coach-student relationships & dashboard separation
- [x] 2.0.5: Student workflow types & custom curriculum system (MVP)
- [x] 2.0.6: Coach custom content creation (video lessons + quizzes)
- [x] 2.0.7: AI Project Assistant

#### 2.1 - 6-Pillar Framework (100% Complete) ✅
- [x] Database migration to 6 fixed pillars
- [x] Rename routes from /sports to /pillars
- [x] Update test files for pillar routes
- [x] Update all UI to reflect pillar structure
- [x] Navigation cleanup (Courses → Pillars)

#### 2.2 - Intelligence-Based Onboarding (100% Complete) ✅
- [x] Student onboarding evaluation (28 questions, 7 categories)
- [x] Intelligence Profile scoring (1.0-4.0 scale)
- [x] V2 onboarding flow (intake, assessment, profile)
- [x] Coach evaluation review with Q&A details
- [x] Cross-reference engine for multi-role comparison

#### Block 1 - Launch Critical (57% Complete) 🔄 ← CURRENT
> **Priority:** Work in order. Do not skip without written approval.

- [x] **B1.1:** Branding update (SportsGoalie → Smarter Goalie) - 2-3h ✅
  - Logo, headers, footers, meta tags, URLs
- [x] **B1.2:** 7th Pillar: Lifestyle - 2h ✅
  - Type definitions, pillar IDs, color classes, UI icons, test updates, database migration
- [ ] **B1.3:** Landing Page + Role Selection - 5-8h
  - 2 self-registration roles: Goalie, Parent (from landing page)
  - Coach: invitation only (existing system)
  - Admin: internal assignment only
  - Introduction video placement
  - Role tiles route to appropriate intake/registration flow
- [x] **B1.4:** Video Database + Tagging System - 8-12h ✅
  - Tagging schema: Pillar (1-7), System (7AMS/7PTS/4LAS/Box/General)
  - User Type, Level (Introduction/Development/Refinement)
  - Angle Marker (AM1-7), Arch Level (L1-L4)
  - Search and filter by any tag combination
- [x] **B1.5:** Parent Dashboard + Child Linking - 10-15h ✅
  - View linked child's progress, scores, chart history, module completion
  - Parent-child linking via link code (XXXX-XXXX format)
  - Goalie-controlled permissions, parent cross-reference display
- [ ] **B1.6:** Dashboard Visualization + Integration - 4-6h
  - Cross-reference results display
  - Connect scoring engine, gap analysis, charting to dashboards
  - Admin, coach, and parent views
- [ ] **B1.7:** Production Email - 2-3h
  - Domain configured for Resend
  - Verification, invitation, notification emails from professional domain

#### Block 2 - Depth & Quality (0% Complete) 🔲
> **Start:** As Block 1 tasks complete or run in parallel where logical.

- [ ] **B2.8:** Questionnaire Alignment - 3-5h
  - Verify all 104 questions match specification documents
  - Flag and fix any mismatches
  - Confirm scoring weights match specs
- [ ] **B2.9:** LMS Enhancements - 5-8h
  - Content recommendation engine
  - When scoring identifies weak area → recommend relevant content
  - Ties scoring engine to content delivery
- [ ] **B2.10:** Analytics Upgrades - 5-8h
  - Parent view: goalie progress over time with trend data
  - Coach view: student development tracking across games/practices
  - Period-by-period pattern recognition
- [ ] **B2.11:** Mobile Polish - 3-5h
  - Review all user-facing screens on iOS/Android
  - Improve touch targets, transitions, load times
  - Charting and questionnaire flows smooth on mobile
- [ ] **B2.12:** Bug Fixes + Iteration Buffer - 5-10h
  - Reserved for issues surfacing with real users
  - Safety net for launch quality

#### Block 3 - Experience Features (0% Complete) 🔲
> **Start:** "Project Active" when capacity allows. These define the personality of Smarter Goalie.

- [ ] **B3.13:** Contextual Support System
  - Pop-up help for terms (M.E.T., V.M.P., Line System, etc.)
  - Layer 1: Quick text/voice explanation
  - Layer 2: Link to short video/deeper dive
  - Layer 3: Additional perspective/related content
  - Analytics: which terms triggered support, depth accessed, helpfulness
  - Admin configures all support content through admin panel
- [ ] **B3.14:** Milestone Recognition System
  - Celebrate knowledge acquisition benchmarks
  - Inspirational quotes, motivational video clips, achievement highlights
  - Students can add own content (highlights, favourite saves)
  - Milestones logged in student's portfolio
- [ ] **B3.15:** Learning Portfolio
  - Permanent record: what learned, when, struggles, support accessed, milestones
  - Feeds analytics, shows parents/coaches the journey
  - Business intelligence: aggregated data reveals what works

> **Note:** These three features are interconnected. Design as one integrated system.

#### NOT IN SCOPE (Requires Written Approval)
- ❌ Stripe / payment integration
- ❌ Multi-language (i18n)
- ❌ AI project assistant improvements
- ❌ Code refactoring or cleanup
- ❌ Organization / Federation portal features
- ❌ Affiliate network system

#### Admin Configuration Work (Admin Assistant)
> **Note:** Per Michael's directive, the following is data entry work for an admin assistant, NOT development work:
- Create chart templates (Practice, Parent Observation, Coach Evaluation) via `/admin/form-templates/new/`
- Verify questionnaire configurations against specs

---

## 🐛 Known Issues & Technical Debt

> Current as of 2026-08-03. Full detail and ownership in `PROJECT_TRACKER.md`.

### High Priority
- **Firestore rules + indexes undeployed.** Production has two active form templates read by code that understands one; the served form is non-deterministic. Deploy rules and indexes, wait for index build, then deploy the app — in that order.
- **Growth Points has never awarded a point in production.** Built 2026-06-06 and 2026-06-22, blocked by missing security rules the entire time. Rules written 2026-08-02, undeployed. Michael has not been told.
- **Goalies cannot see their own session chart history.**
- **Client-side `awardPoints` self-award risk** — points are awarded from the client, so the call is reachable by a determined user.

### Medium Priority
- Five template-builder bugs: edit page, delete/archive, duplicate-ID collision, silent validation errors, and the Text+Analytics field trap
- 404 link at [app/charting/sessions/[id]/page.tsx:468](app/charting/sessions/[id]/page.tsx#L468)
- Repo-wide ESLint broken — ESLint 9 against a legacy `.eslintrc`
- `DropdownMenu` with `modal={false}` clips inside scroll containers on admin quizzes and moderation
- MindSet template labels carry stray whitespace: `"Resilience "`, `" Positive Attitude "`, `"Flexibility "` — needs Michael's confirmation before trimming

### Low Priority
- Anthropic model ID duplicated across `app/api/chatbot/route.ts` and `src/lib/ai/claude.service.ts` — should be one constant
- `.surface-dark` (renamed from `.charting-dark` 2026-08-13) not applied to `/charting/sessions/[id]/chart` — `ChartingFormWrapper.tsx:220` sits on `bg-gray-50` inside the navy shell. Unresolved question, not a decided bug.

### Technical Debt
- **Swallowed promise rejections are a recurring pattern**, not isolated incidents — the Growth Points `.finally()`, the silent coach-invite email failure, and the silent baseline-save failure are the same shape. Worth one deliberate sweep rather than fixing them as they surface.
- **Local patches for systemic bugs.** The mangled-timestamp bug was patched into `CalendarHeatmap` (2026-04-20), then into the coach panel (2026-06-21), before finally getting a central `toDateSafe` (2026-08-02). Cost: roughly four months of the same defect resurfacing.
- **Features shipping without Firestore rules** — Growth Points and the baseline intelligence scores both needed rules retrofitted after the fact. Rules should be part of the feature, not a follow-up.
- Corrupted timestamp documents may still exist in Firestore from before the `removeUndefinedFields` fix. A repair script was offered; run a dry run first.
- Consider refactoring service layer for better type safety
- `CLAUDE.md` still describes Next.js 14; the project is on 16.2.7
- `docs/sessions/template.md`, referenced by `CLAUDE.md`, does not exist

---

## 📝 Recent Decisions

### 2026-08-03: Reconstruct the Five-Month Session Log
**Decision:** Rebuild session files for 2026-03-13 through 2026-08-02 from git history rather than leaving the gap
**Rationale:** The gap had a concrete cost — the 2026-08-02 billing table's "actual hours" column had to be filled with estimates because nothing was tracked, and the open-items list existed only in conversation. Both are now on disk.
**Impact:** 39 reconstructed session files, ~355.5h recovered as an estimated figure. Every reconstructed file carries an explicit provenance line so the estimates are never mistaken for measurements.
**Caveat:** This is a record of what was built, not a time log. Do not bill from it.

### 2026-08-02: Pillar Concurrency Scoped by `(sport, pillar)`, Not `sport` Alone
**Decision:** Add a required `pillar` field to `FormTemplate` rather than overloading `sport`
**Rationale:** `sport` means "Hockey" — the whole combined tracker. Pillar charts must coexist *with* the combined chart, not replace it, so they need a separate axis. Reuses the existing `PillarSlug` taxonomy rather than inventing new strings.
**Impact:** MindSet, Skating, and combined Hockey can all be active simultaneously and independently. Required a one-time backfill check before deploying scoped code (dry run: 0 documents needed updating).

### 2026-08-02: Baseline Computed from Full History, Never the Filtered Window
**Decision:** `recalculateStudentAnalytics()` derives `allEntries` for the baseline and `windowedEntries` for averages and trend
**Rationale:** If the baseline came from the date-filtered set, selecting anything but "All-Time" on the dashboard would silently exclude the baseline entry and corrupt every growth figure shown.
**Impact:** Two derived collections instead of one; correct growth numbers under every filter.

### 2026-06-24: Terminology Locked to Coach Mike's Brief
**Decision:** Adopt Michael's exact wording across the product — Emotional Balance, Weak Goals, Good Decision Factor, 6 Zone Grid, Development (pacing level), Pre-Game Stress, Reading the Play
**Rationale:** Client-facing language is Michael's to define; paraphrasing it creates drift between the product and how he teaches.
**Impact:** Renames touched 31+ files across two sessions. Standing rule since: never invent client-facing copy.

### 2026-03-19: `docs/` Added to `.gitignore` (documentation practice lapsed here)
**Decision:** Untracked 67 client session documents (~10,000 lines) under a broad `docs/` ignore rule
**Rationale:** Client material should not be in the public repo
**Impact, unintended:** The rule is wholesale — it also excluded internal session logs and `PROJECT_TRACKER.md`. Session logging stopped the same week and did not resume for five months. 87 older files under `docs/` remain tracked only because they predate the rule. New session files need `git add -f` to commit.

### 2026-03-11: Work Directive Block Structure
**Decision:** Replace Phase 2.3-2.6 with Michael's Block 1/2/3 priority structure
**Rationale:** Per Michael's Work Directive (2026-03-10) - clear prioritization with launch-critical features first
**Impact:** New 7th pillar (Lifestyle), 8-role landing page, video tagging system, parent dashboard prioritized. Phase 2.5 (Pillar Levels) and 2.6 (Access Hardening) removed from immediate scope
**Key Changes:**
- Block 1: Launch Critical - Branding, 7th pillar, landing page, video DB, parent dashboard, email
- Block 2: Depth & Quality - Questionnaire verification, LMS, analytics, mobile, bug buffer
- Block 3: Experience Features - Contextual Support, Milestones, Portfolio (interconnected system)

### 2026-03-07: Component Key Prop for State Reset
**Decision:** Use React `key` prop to force component remount instead of `useEffect` for state reset
**Rationale:** `key` prop is more idiomatic React pattern - React handles full state reset automatically on remount
**Impact:** Cleaner code, no manual state reset logic needed, prevents bugs from incomplete state cleanup
**Alternatives Considered:** `useEffect` watching `question.id` to reset state (rejected - more code, potential for missed state)

### 2026-03-06: 1.0-4.0 Continuous Scoring Scale
**Decision:** Replace discrete levels (beginner/intermediate/advanced) with continuous 1.0-4.0 scoring scale
**Rationale:** Per Michael's specification - provides finer-grained intelligence profile, enables weighted category scoring, supports gap/strength analysis
**Impact:** More nuanced assessment results, better personalization, cross-reference engine can compare scores across roles
**Alternatives Considered:** Keeping discrete levels (rejected - too coarse for intelligence profiling), 0-100 scale (rejected - Michael's spec uses 1.0-4.0)

### 2026-03-06: 7 Assessment Categories per Role
**Decision:** Use 7 distinct categories for each role (goalie/parent/coach) instead of mapping to 6 pillars
**Rationale:** Per Michael's scoring guide - each role has unique categories (e.g., parent has "Car Ride Home", coach has "Approach")
**Impact:** More accurate role-specific assessment, enables meaningful cross-reference comparisons
**Alternatives Considered:** Map to 6 pillars (rejected - loses role-specific nuance), single category set (rejected - roles assess different aspects)

### 2026-03-06: Pacing Level Thresholds
**Decision:** Use configurable thresholds: introduction (<2.2), development (2.2-3.1), refinement (>3.1)
**Rationale:** Per Michael's spec - maps continuous scores to actionable content pacing levels
**Impact:** Clear content progression path, admin-adjustable thresholds, consistent with existing pillar structure
**Alternatives Considered:** Fixed percentile-based thresholds (rejected - less intuitive), more granular levels (rejected - adds complexity)

### 2026-03-05: 6-Pillar Architecture
**Decision:** Repurpose `sports` collection as pillars with fixed document IDs (pillar_mindset, etc.)
**Rationale:** Minimizes refactoring by reusing existing sportId references throughout codebase
**Impact:** All existing services work with pillars, no collection renames needed
**Alternatives Considered:** New `pillars` collection (rejected - too much refactoring), auto-generated IDs (rejected - can't reference pillars in code)

### 2026-03-05: Remove Pillar Create/Delete in Admin
**Decision:** Admin can edit pillars but cannot create or delete them
**Rationale:** 6 pillars are fundamental to the Ice Hockey Goalie training system and should be fixed
**Impact:** Simpler admin UI, prevents accidental data loss, ensures consistent pillar structure
**Alternatives Considered:** Keep full CRUD (rejected - pillars shouldn't change), hide admin page entirely (rejected - still need to edit descriptions/images)

### 2026-03-04: Onboarding Evaluation Architecture
**Decision:** Store evaluations in `onboarding_evaluations` collection with document ID `eval_{userId}`
**Rationale:** One-to-one relationship with user, easy lookup, prevents duplicate evaluations
**Impact:** Simple queries, clear ownership, single evaluation per student
**Alternatives Considered:** Subcollection under user (rejected - harder to query across users for coach review)

### 2026-03-04: Level Calculation Thresholds
**Decision:** Use fixed thresholds: beginner <40%, intermediate 40-69%, advanced 70%+
**Rationale:** Clear boundaries, reasonable distribution, easy to understand and explain
**Impact:** Consistent level assignment, predictable results, coaches can adjust if needed
**Alternatives Considered:** Adaptive thresholds (rejected - too complex for MVP), pillar-specific thresholds (rejected - confusing)

### 2026-03-04: Auto-Advance After Question Selection
**Decision:** Automatically advance to next question after brief feedback (500ms delay)
**Rationale:** Maintains flow, reduces cognitive load, more immersive experience
**Impact:** Faster completion, smoother UX, no "Next" button friction
**Alternatives Considered:** Manual "Next" button (rejected - adds friction), instant advance (rejected - too fast for feedback)

### 2026-03-04: Full-Page Quiz Creator with Tabs
**Decision:** Convert video quiz creator from dialog to full-page with tab-based navigation
**Rationale:** Dialog approach was cramped, caused horizontal scrolling, poor UX for complex multi-step form
**Impact:** Better space utilization, eliminates scroll issues, tabs allow non-linear navigation
**Alternatives Considered:** Keep dialog with fixes (rejected - fundamental space limitation), step wizard (rejected - still cramped)

### 2026-03-04: Visual Toggle Buttons for True/False
**Decision:** Replace dropdown with large visual toggle buttons showing True (green) and False (red)
**Rationale:** Dropdown was blank initially and confusing; toggle buttons show both options with clear visual cues
**Impact:** Much more intuitive selection, immediate visual feedback, clearer UX
**Alternatives Considered:** Radio buttons (acceptable but less visual), keep dropdown (rejected - poor UX)

### 2026-03-04: Split Input for Fill in the Blank
**Decision:** Use two input fields (text before blank, text after blank) instead of single textarea with manual `___`
**Rationale:** Users shouldn't need to know/remember to add `___`; split approach eliminates confusion
**Impact:** Intuitive question creation, live preview shows student view, no manual blank marker needed
**Alternatives Considered:** Auto-detect `___` (rejected - not intuitive), placeholder syntax (rejected - too technical)

### 2026-03-04: Client-Side Sorting for Coach Content
**Decision:** Remove `orderBy` from Firestore queries and sort results client-side
**Rationale:** Firestore requires composite indexes for where + orderBy combinations; client-side avoids this
**Impact:** No index maintenance required, works immediately, acceptable for coach content data sizes
**Alternatives Considered:** Create composite index (more ops overhead), no sorting (poor UX)

### 2026-03-02: Non-Blocking View Count Increment
**Decision:** Wrap view count increment in try-catch so read operations succeed even if analytics update fails
**Rationale:** Students don't have write permission to custom_content_library, but should still be able to read content
**Impact:** Core read functionality works for all users; view tracking may be incomplete for student views
**Alternatives Considered:** Add student write permission for metadata only (rejected - security risk)

### 2026-03-02: Public Read for Custom Content Library
**Decision:** Make custom_content_library publicly readable (allow read: if true)
**Rationale:** Same approach as sports, skills, and quizzes - educational content should be accessible to all
**Impact:** Any authenticated or unauthenticated user can read custom content
**Alternatives Considered:** Complex per-student permissions based on curriculum assignment (rejected - over-engineering)

### 2026-03-01: Store Coach Video Quizzes in Existing Collection
**Decision:** Store coach-created video quizzes in the existing `video_quizzes` collection with `source: 'coach'` marker
**Rationale:** Reuses all existing quiz player infrastructure, progress tracking, and UI components without duplication
**Impact:** Single quiz player works for both admin and coach quizzes, consistent user experience
**Alternatives Considered:** Separate `coach_video_quizzes` collection (rejected - would require duplicating player logic)

### 2026-03-01: useState over react-hook-form
**Decision:** Use basic useState for form management instead of react-hook-form
**Rationale:** Project doesn't have react-hook-form installed; useState provides equivalent functionality for current needs
**Impact:** Simpler dependency management, no new packages required
**Alternatives Considered:** Installing react-hook-form (rejected - unnecessary dependency for current scope)

### 2026-02-27: Skip Email Verification for Invited Coaches
**Decision:** Invited coaches skip email verification; clicking the invitation link serves as verification
**Rationale:** Invitation emails are sent to the coach's email - clicking the link proves email ownership
**Impact:** Smoother coach onboarding, no redundant verification step, coaches can log in immediately
**Alternatives Considered:** Require email verification anyway (rejected - redundant and poor UX)

### 2026-02-27: Dual Email Verification Check
**Decision:** Login checks both Firebase Auth `emailVerified` AND Firestore document `emailVerified`
**Rationale:** Firebase Auth won't have emailVerified set for invited coaches, but we track it in Firestore
**Impact:** Supports both regular email verification and invitation-based verification
**Alternatives Considered:** Force Firebase Auth verification for all users (rejected - requires additional email)

### 2026-02-24: Smart Context Loading for AI Chatbot
**Decision:** Default to smart context loading (5-10 relevant docs) instead of full context
**Rationale:** Reduces token usage 80-90%, faster responses, better efficiency
**Impact:** Cost-efficient AI assistant, acceptable response quality, can load full context if needed
**Alternatives Considered:** Always full context (rejected - expensive), no filtering (rejected - too simple)

### 2026-02-24: Claude Sonnet 4 Model Selection
**Decision:** Use Claude Sonnet 4 instead of Opus 4.5 for project assistant chatbot
**Rationale:** More efficient, sufficient quality for Q&A, admin-only tool
**Impact:** 80% cost savings with acceptable response quality for documentation queries
**Alternatives Considered:** Opus 4.5 (rejected - overkill for Q&A), Haiku (rejected - insufficient intelligence)

### 2026-02-24: Client Documentation Structure
**Decision:** Create separate client documentation in `docs/client/` with category-based folders
**Rationale:** Clear separation from dev sessions, organized by topic, easy to maintain, auto-discovery
**Impact:** Clean structure for AI context, easy to update, doesn't mix with internal session logs
**Alternatives Considered:** Inline in session files (rejected - duplication), single file (rejected - too large)

### 2026-02-23: Content Browser Component Architecture
**Decision:** Extract content browser into separate reusable component
**Rationale:** Can be reused in other parts of app, easier to maintain, clean separation of concerns
**Impact:** Reusable component, better code organization, improved maintainability
**Alternatives Considered:** Inline in curriculum builder (rejected - too complex and not reusable)

### 2026-02-23: Dynamic Content Title Loading
**Decision:** Load content titles separately after loading curriculum items
**Rationale:** Curriculum stores only contentId reference, need to fetch actual names from source
**Impact:** Always displays current content names, no stale data, single source of truth
**Alternatives Considered:** Store titles in curriculum (rejected - data duplication, sync issues)

### 2026-02-23: Client-Side Content Filtering
**Decision:** Load all sport content, perform search/filter client-side
**Rationale:** Small datasets, instant UX, no server round-trips for every filter change
**Impact:** Immediate search results, better UX, reduced database queries
**Alternatives Considered:** Server-side filtering (unnecessary overhead for current data scale)

### 2026-02-23: Student Workflow Type Architecture
**Decision:** Implement two distinct workflow types: automated (self-paced) and custom (coach-guided)
**Rationale:** Supports both independent learners and students who need personalized coaching
**Impact:** Enables custom curriculum system, differentiated learning paths, premium tier foundation
**Alternatives Considered:** Per-pillar workflow (too complex), single workflow for all (too limiting)

### 2026-02-23: All-or-Nothing Workflow Assignment
**Decision:** Students are either fully automated or fully custom (not per-pillar)
**Rationale:** Simpler mental model, easier to implement and maintain, clearer user experience
**Impact:** Clear user choice, straightforward implementation, can enhance later if needed
**Alternatives Considered:** Mixed workflow per pillar (deferred as too complex for MVP)

### 2026-02-23: Curriculum Storage Model
**Decision:** Store curriculum items inline in curriculum document, not separate collection
**Rationale:** Simpler queries, atomic updates, good performance for expected data size
**Impact:** Fast reads, easy management, scales well for expected curriculum sizes
**Alternatives Considered:** Separate items collection (rejected - adds complexity without benefits for MVP)

### 2026-02-23: Content Library Separation
**Decision:** Create separate custom_content_library collection for reusable coach content
**Rationale:** Enables content sharing, reduces duplication, tracks usage across students
**Impact:** Efficient content reuse, sharing capabilities, usage analytics possible
**Alternatives Considered:** Inline only (no sharing), per-student (duplication), global pool (no ownership)

### 2026-02-23: MVP Content Selection Approach
**Decision:** Use placeholder content IDs for MVP, defer full content browser
**Rationale:** 6-hour MVP target, full browser would add 4-6 hours, core functionality testable without it
**Impact:** Functional MVP ready for testing, clear enhancement path for future
**Alternatives Considered:** Build full browser immediately (rejected - not MVP critical), block MVP (rejected)

### 2026-02-22: Coach Invitation Token Format
**Decision:** Use 32-character crypto-random tokens with 7-day default expiry
**Rationale:** Provides strong security (62^32 combinations), URL-safe, reasonable acceptance window
**Impact:** Secure invitation system without complexity of JWT, prevents indefinite valid tokens
**Alternatives Considered:** JWT (too complex), UUID (less readable), shorter tokens (less secure)

### 2026-02-22: Email Service Development Mode
**Decision:** Log emails to console in development, prepare infrastructure for production services
**Rationale:** No email service configured yet, but code ready for SendGrid/AWS SES integration
**Impact:** Can test invitation flow immediately, easy switch to production email later
**Alternatives Considered:** Mock email service (rejected - console simpler), immediate integration (premature)

### 2026-02-22: Invitation Uniqueness Check
**Decision:** Prevent duplicate pending invitations for same email address
**Rationale:** Avoids confusion with multiple active tokens, clearer user experience
**Impact:** Admins must revoke or wait for expiry before resending to same email
**Alternatives Considered:** Allow multiple (rejected - confusing), auto-revoke old (complex)

### 2026-02-22: Student ID Format & Security
**Decision:** Use SG-XXXX-XXXX format with crypto-random generation, exclude confusing characters
**Rationale:** Short enough to share verbally, long enough for uniqueness (32^8 = 1.1T combinations), clear for reading
**Impact:** Parents can easily link to children, no approval workflow needed (possession = legitimacy)
**Alternatives Considered:** Sequential IDs (security risk), UUIDs (too long), email-based linking (privacy concerns)

### 2026-02-22: Registration Security Restrictions
**Decision:** Remove Coach and Admin from public registration, only allow Student and Parent
**Rationale:** Prevent unauthorized admin/coach account creation, coaches added via invitation only
**Impact:** Significantly improved security, cleaner registration UI, sets up invitation system
**Alternatives Considered:** CAPTCHA (insufficient), manual approval (too slow), allow all roles (insecure)

### 2026-02-22: Parent-Child Linking Model
**Decision:** Parents link using student ID, no student approval required
**Rationale:** Possession of student ID proves relationship (like school systems), simpler UX
**Impact:** Faster parent onboarding, less friction, supports multiple parents per student
**Alternatives Considered:** Student approval required (too complex), email verification (still need student ID)

### 2026-02-22: Role Selection UI Pattern
**Decision:** Use Select dropdown instead of radio buttons for role selection
**Rationale:** Cleaner UI, scales better for future role additions, consistent with modern UI patterns
**Impact:** Better UX for registration, more maintainable as roles expand
**Alternatives Considered:** Radio buttons (too much vertical space), segmented control (limited flexibility)

### 2026-02-22: Role-Based Redirect Strategy
**Decision:** All non-admin roles redirect to `/dashboard` for now (Phase 2.0.1)
**Rationale:** Role-specific dashboards will be implemented in later phases (Phase 2.2+)
**Impact:** Simplifies initial implementation, allows incremental feature rollout
**Alternatives Considered:** Create separate routes immediately (premature without features to populate them)

### 2026-02-22: Session File Organization
**Decision:** Store detailed session logs in `docs/sessions/YYYY-MM/` instead of single file
**Rationale:** Prevents PROGRESS.md from becoming unwieldy; easier to archive and search
**Impact:** PROGRESS.md now serves as high-level dashboard only
**Alternatives Considered:** Single file (rejected - would grow too large)

### 2026-02-22: Progress Tracking System
**Decision:** Implement mandatory progress tracking in PROGRESS.md
**Rationale:** Need visibility into time spent and work completed for project management
**Impact:** All future sessions must update this file and create session logs
**Alternatives Considered:** External project management tools (rejected for simplicity)

---

## 🔄 Recent Changes (Last 30 Days)

> ⚠️ Entries below 2026-08-02 are from March 2026 and were never rolled to Archive during the logging gap. They are kept as-is for the historical record. For 2026-03-13 onward, use the Recent Sessions list and the session files in `docs/sessions/`.

### 2026-08-02 (Session: Concurrent Pillar Charting Engine)
- **Feature:** Added required `pillar: PillarSlug | 'combined'` to `FormTemplate`; concurrency now scoped by `(sport, pillar)` compound key
- **Feature:** `getActiveTemplate({ sport, pillar })` replaces the zero-arg version; three call sites updated
- **Feature:** New `getActiveTemplatesForSport()` — one query for all simultaneously-active templates
- **Fix:** Replaced `deactivateAllTemplates()` and `deactivateOtherTemplates()` — both deactivated every template system-wide — with `deactivateTemplatesInScope(sport, pillar, exceptTemplateId?)` applied via `writeBatch`
- **Feature:** Baseline tracking — `baselineValue`, `baselineDate`, `growthFromBaseline` on field and category results, computed from full entry history rather than the date-filtered window
- **Fix:** `toDateSafe` in `src/lib/utils/timestamp.ts` — one tolerant parser for `Timestamp`, `Date`, number, string, and the mangled `{seconds, nanoseconds}` map shape written by the old `removeUndefinedFields`. Helpers `millisOf`, `compareBySubmittedAt`, `describeError` built on it.
- **Fix:** Growth Points security rules written for `growth_points_balance` and `growth_points_transactions` — absent since the feature was built on 2026-06-06, blocking every read and write
- **Fix:** `useGrowthPoints` used `.finally()` where it needed `.catch()`, silently swallowing every permission denial
- **Feature:** `app/charting/pillars/` — standalone pillar check-in route, not gated behind logging a session
- **Admin:** Pillar dropdown on template creation, cards grouped by pillar, `checkDefaultTemplatesExist()` scoped so activating a pillar template doesn't hide the initialize banner
- **Migration:** Backfill dry run against `form_templates` reported 0 documents needing update
- **Verification:** Not yet deployed. Rules, indexes, and app deploy all outstanding.

### 2026-03-12 (Session: Test Import Path Fixes)
- **Fix:** Corrected import path aliases in 8 source files (@/src/* → @/*)
- **Fix:** Fixed app/pillars, app/dashboard, app/admin pages with wrong @/src/lib imports
- **Fix:** Fixed src/hooks/useEnrollment.ts with wrong @/src/lib imports
- **Testing:** Rewrote sports-catalog.test.tsx for 7-pillar system (was testing old "Sports Catalog" UI)
- **Testing:** Rewrote sports-detail.test.tsx with correct service mocks
- **Testing:** Simplified auth context tests to avoid Vitest act()+rejects incompatibility
- **Testing:** Fixed type errors in custom-content.service.test.ts and custom-curriculum.service.test.ts
- **Results:** 347 tests passing, 81 failing (11 test files with pre-existing mocking issues)
- **Verification:** TypeScript compiles, build passes

### 2026-03-12 (Session: Parent Dashboard + Child Linking)
- **Feature:** Created `src/types/parent-link.ts` with ParentLink, LinkedChildSummary, LinkedParentSummary, ParentCrossReferenceView types
- **Feature:** Added parent/child linking fields to User interface (linkedParentIds, linkedChildIds, parentLinkCode, etc.)
- **Feature:** Created ParentLinkService with full CRUD operations for parent-child linking
- **Feature:** Implemented XXXX-XXXX format link codes with 7-day expiration
- **Feature:** Created ParentDashboard with stats cards, linked children overview, tabs
- **Feature:** Created ChildProgressCard with progress, quizzes, streak, assessment status
- **Feature:** Created LinkChildForm with two-step code validation and relationship selection
- **Feature:** Created CrossReferenceDisplay for parent-goalie perception comparison
- **Feature:** Created ParentLinkManager for goalie settings (code generation, parent management)
- **Routes:** Added `/parent`, `/parent/link-child`, `/parent/child/[childId]`, `/parent/child/[childId]/assessment`, `/parent/onboarding`
- **UI:** Created tooltip.tsx Radix UI wrapper component
- **Integration:** Added ParentLinkManager to profile page for students
- **Database:** Uses parentLinks and parentLinkCodes collections
- **Verification:** Build passes, 14 new files, 3 modified files
- **Block 1.5:** Complete ✅

### 2026-03-12 (Session: Add 7th Pillar - Lifestyle)
- **Feature:** Added 'lifestyle' to PillarSlug union type
- **Feature:** Added lifestyle pillar to PILLARS array (Heart icon, pink color, order 7)
- **Feature:** Added pillar_lifestyle ID to PILLAR_IDS constant
- **Feature:** Added pink color classes to PILLAR_COLOR_CLASSES
- **Feature:** Added pink hex color (#EC4899) to seed data
- **Feature:** Updated migration script with lifestyle pillar definition
- **UI:** Added Heart icon to pillars page, admin pillars page, and dashboard
- **UI:** Updated "6 pillars" text to "7 pillars" across all UI
- **Testing:** Updated test assertions in 3 test files for 7-pillar structure
- **Database:** Ran migration - created pillar_lifestyle document
- **Verification:** Build passes, pushed to remote
- **Block 1.2:** Complete ✅

### 2026-03-12 (Session: Branding Update - Smarter Goalie)
- **Branding:** Updated package.json name from `sportscoach-v3` to `smarter-goalie`
- **Branding:** Updated all user-facing metadata and page titles
- **Branding:** Updated AI system prompts in project assistant
- **Branding:** Updated README.md, CLAUDE.md, TESTING.md documentation
- **Branding:** Updated Dockerfile, Dockerfile.dev, docker.sh infrastructure
- **Branding:** Updated planning and technical architecture docs (8 files)
- **Branding:** Updated client and internal documentation (16 files)
- **Branding:** Updated test files and service comments (8 files)
- **Verification:** Build passes, 42 files modified, pushed to remote
- **Block 1.1:** Complete ✅

### 2026-03-07 (Session: Reset Incomplete Evaluations Script)
- **Script:** Created `scripts/reset-incomplete-evaluations.ts` migration script
- **Feature:** Detects incomplete evaluations (stuck in_progress or missing assessmentResponses)
- **Feature:** Supports `--dry-run` flag for safe previewing
- **Feature:** Deletes evaluation docs and resets user onboarding flags
- **Execution:** Reset 4 evaluations (1 active user can restart, 3 orphaned docs cleaned up)
- **Build:** Script runs successfully with `npx tsx`

### 2026-03-07 (Session: Add Detailed Q&A View to Evaluation Page)
- **Feature:** Added collapsible "Assessment Responses" section to coach evaluation page
- **Feature:** Displays all assessment questions and answers grouped by category
- **Feature:** Shows question code (Q1.1), question text, selected answer text, and score badge
- **Feature:** Color-coded score badges (green ≥3.1, blue 2.2-3.1, amber <2.2)
- **UI:** Expand/collapse toggle with chevron icons
- **UI:** Category headers with icons and question counts
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-07 (Session: Fix Onboarding Redirect for Students)
- **Fix:** Updated login page redirect logic to check `onboardingCompleted` for students
- **Fix:** Students who haven't completed onboarding now redirect to `/onboarding` instead of `/dashboard`
- **Fix:** Prevents race condition where students briefly see dashboard before redirect
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-07 (Session: Remove Onboarding V2 Backward Compatibility)
- **Refactor:** Renamed component files: `welcome-screen-v2.tsx` → `welcome-screen.tsx`, etc.
- **Refactor:** Removed type aliases: `AssessmentResponseV2`, `OnboardingEvaluationV2`
- **Refactor:** Removed legacy functions: `getLevelDisplayText`, `getLevelColor`
- **Refactor:** Removed legacy fields from `OnboardingEvaluation`: `overallLevel`, `overallPercentage`
- **Refactor:** Removed 5 service method aliases (`createEvaluationV2`, `getEvaluationV2`, etc.)
- **Refactor:** Removed `eval_v2_` ID fallback logic in service methods
- **Refactor:** Updated coach students page to use pacing level only
- **Refactor:** Updated scoring files to use `AssessmentResponse` instead of `AssessmentResponseV2`
- **Testing:** Removed backward compatibility test suite, all 26 onboarding tests pass
- **Build:** Net removal of ~2,259 lines, TypeScript compiles with zero errors

### 2026-03-07 (Session: Fix Custom Quiz Not Found Bug)
- **Fix:** Added custom content ID resolution to video quiz page
- **Fix:** Quiz page now detects `content_xxx` IDs and fetches actual `videoQuizId` from custom content library
- **Fix:** Students can now access coach-created quizzes assigned in their curriculum
- **Import:** Added `customContentService` import to quiz page
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-07 (Session: Email Verification Branding)
- **Feature:** Added Resend email service integration for branded verification emails
- **Feature:** Created verification email API endpoint (`/api/auth/send-verification`)
- **Feature:** Built branded email template with "Smarter Goalie" branding, goalie emoji logo, blue gradient header
- **Feature:** Updated email service to use Resend in production (when configured)
- **Config:** Added RESEND_API_KEY and RESEND_FROM_EMAIL to `.env.example`
- **Dependencies:** Added `resend` package
- **Note:** Using Firebase's built-in verification for now; Resend code ready for Phase B when domain available
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-07 (Session: V2 Onboarding UI Fixes)
- **UI:** Fixed intake screen progress dots size (`w-2.5` → `w-3`)
- **UI:** Removed `max-w-lg` constraint on intake options container
- **UI:** Added letter badges (A, B, C, D) to intake options matching old design
- **UI:** Increased option badge size from `w-6 h-6` to `w-10 h-10`
- **UI:** Increased progress bar height from `h-1.5` to `h-2`
- **UI:** Increased progress icon sizes from `w-8 h-8` to `w-10 h-10 sm:w-12 sm:h-12`
- **UI:** Increased inner icon sizes from `w-4 h-4` to `w-5 h-5 sm:w-6 sm:h-6`
- **UI:** Widened progress connectors for better visual balance
- **Fix:** Added `key` prop to `AssessmentQuestionV2` to force remount on question change
- **Fix:** Resolved stuck assessment flow (component not advancing after answer)
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-06 (Session: Michael's Phase 2 Scoring Foundation)
- **Feature:** Implemented Phases A, B, C of Michael's Phase 2 specification integration
- **Feature:** Created 1.0-4.0 continuous scoring scale with 7 categories per role
- **Feature:** Built goalie intake questions (7 questions, 4 screens) with PIPEDA compliance triggers
- **Feature:** Built goalie assessment questions (28 questions, 7 categories) with exact scores from spec
- **Feature:** Built parent intake/assessment questions (6+28 questions, "car ride home" focus)
- **Feature:** Built coach intake/assessment questions (7+28 questions)
- **Feature:** Created intelligence profile scoring engine with weighted category calculation
- **Feature:** Implemented pacing level mapping (introduction/development/refinement thresholds)
- **Feature:** Built gap/strength analysis based on deviation from average score
- **Feature:** Created cross-reference engine for multi-role comparison
- **Feature:** Implemented alignment detection and gap flagging (confidence_gap, feedback_gap, car_ride_gap, etc.)
- **Types:** Added PacingLevel, IntelligenceProfile, CrossReferenceResult, CategoryWeight types
- **Types:** Added OnboardingEvaluationV2 for new scoring system
- **Types:** Maintained backward compatibility with legacy OnboardingEvaluation
- **Data:** Created centralized data index (`src/data/index.ts`) for questionnaire exports
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-05 (Session: Test Files Pillar Route Update)
- **Testing:** Updated 5 test files with `/sports` → `/pillars` route changes
- **Testing:** Fixed sports-workflows.spec.ts assertions to match actual UI
- **Testing:** Fixed strict mode violations using `.first()` selectors
- **Testing:** Changed `networkidle` to `domcontentloaded` for timeout reliability
- **Testing:** Updated admin tests to handle auth redirect/loading/content states
- **Testing:** Fixed admin-dashboard.spec.ts line 148 assertion (`/admin/pillars`)
- **Verification:** All 19 sports-workflows.spec.ts tests pass on chromium
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-05 (Session: Route Renaming)
- **Refactor:** Renamed `app/sports/` directory to `app/pillars/`
- **Refactor:** Renamed `app/admin/sports/` directory to `app/admin/pillars/`
- **Refactor:** Renamed `src/__tests__/app/sports/` directory to `src/__tests__/app/pillars/`
- **Routes:** Updated all internal navigation links (14 files modified)
- **Routes:** Updated middleware public routes from `/sports` to `/pillars`
- **Routes:** New routes: `/pillars`, `/pillars/[id]`, `/pillars/[id]/skills/[skillId]`
- **Routes:** New admin routes: `/admin/pillars`, `/admin/pillars/[id]/skills`
- **Tests:** Updated test file import paths and link selectors
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-05 (Session: 6-Pillar Conversion)
- **Feature:** Converted platform from generic sports/courses to fixed 6 Ice Hockey Goalie pillars
- **Feature:** Created pillar utilities (`src/lib/utils/pillars.ts`) with PILLAR_IDS, color classes, helper functions
- **Feature:** Updated seed data to use PILLARS constant from onboarding types
- **Feature:** Added `Pillar` type alias for `Sport` in types/index.ts
- **UI:** Updated `/sports` page to show 6 pillar cards with icons and gradient headers
- **UI:** Updated `/sports/[id]` page with pillar gradient header showing icon
- **UI:** Updated dashboard to show pillar-based progress with icons and colors
- **UI:** Renamed "Course Progress" to "Pillar Progress" throughout dashboard
- **Admin:** Updated `/admin/sports` to "Pillar Management" - removed create/delete buttons
- **Admin:** Added info card explaining fixed 6-pillar structure
- **Admin:** Updated `/admin/sports/[id]/skills` with pillar gradient header
- **Migration:** Created `scripts/migrate-to-pillars.ts` with dry-run and keep-data support
- **Migration:** Executed migration - deleted 22 old sports, created 6 pillars
- **Migration:** Reassigned 12 skills and 15 video quizzes to pillar_mindset (default)
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-04 (Session: Onboarding Redirect Fix & Workflow Filter)
- **Fix:** Added onboarding fields (onboardingCompleted, onboardingCompletedAt, initialAssessmentLevel) to auth context user object
- **Fix:** Added refreshUser() method to auth context for re-fetching user data from Firestore
- **Fix:** Updated onboarding hook to refresh user context before redirecting to dashboard
- **Fix:** Fixed redirect loop between /onboarding and /dashboard after completing onboarding
- **Feature:** Added workflow filter tabs to coach students page (All/Custom/Automated)
- **Feature:** Added workflow type badges (Custom=purple, Automated=blue) to student cards
- **Feature:** Conditional UI: curriculum management only for custom students, evaluation view for all
- **Maintenance:** Updated cleanup-user.ts script to include onboarding_evaluations collection

### 2026-03-04 (Session: Codebase Verification & Bug Fixes)
- **Fix:** Added .catch() error handler to coach-breadcrumb.tsx promise chain
- **Fix:** Replaced `any` types with proper TypeScript types in LegacyChartingForm.tsx
- **Fix:** Changed Playwright port configuration from 3001 to 3000
- **Fix:** Removed redundant port override in student-onboarding-evaluation.spec.ts
- **Verification:** TypeScript type-check passes with 0 errors
- **Verification:** Next.js build succeeds with 50 routes

### 2026-03-04 (Session: Onboarding Rules & Coach UX Improvements)
- **Security:** Deployed Firestore rules for onboarding_evaluations collection
- **Security:** Students can create/update own evaluation, coaches can only update coachReview
- **Testing:** Created Playwright test suite for onboarding flow (4 tests)
- **Testing:** Verified authentication, welcome screen, dark theme, responsive design
- **Feature:** Added Google Drive URL support to VideoUploader component
- **Refactor:** Made VideoUploader reusable with flexible props (userId, uploadFolder)
- **Refactor:** Admin quiz pages now use shared VideoUploader (-700 lines)
- **UI:** Created CoachBreadcrumb component for contextual navigation
- **UI:** Added Content Library link to coach navigation bar
- **UI:** Added active state highlighting to coach nav buttons
- **UI:** Added returnTo parameter for quiz creation from curriculum page
- **Fix:** Corrected video MIME types in storage rules (AVI, WMV)
- **Fix:** Fixed storage service MIME type for MOV files
- **Cleanup:** Deleted deprecated quiz-creator.tsx dialog component

### 2026-03-04 (Session: Student Onboarding Evaluation System)
- **Feature:** Created complete student onboarding evaluation system (Phase 2.0.7)
- **Feature:** Implemented 27 assessment questions across 6 Ice Hockey Goalie Pillars
- **Feature:** Built OnboardingService with Firebase persistence and auto-progress saving
- **Feature:** Created useOnboarding hook for state management (phases: loading → welcome → pillar_intro → question → results → complete)
- **Feature:** Built immersive UI components: OnboardingContainer, OnboardingProgress, WelcomeScreen, PillarIntro
- **Feature:** Created question components: RatingQuestion (1-5 scale), MultipleChoiceQuestion, TrueFalseQuestion, VideoScenarioQuestion
- **Feature:** Built ResultsScreen with per-pillar breakdown and level display
- **Feature:** Added automatic level calculation (beginner <40%, intermediate 40-69%, advanced 70%+)
- **Feature:** Created coach evaluation review page with level adjustment capability
- **Feature:** Added dashboard redirect guard for students with incomplete onboarding
- **UI:** Added evaluation status badges to coach students page
- **UI:** Added "View Evaluation" button for completed evaluations
- **Types:** Added onboardingCompleted, onboardingCompletedAt, initialAssessmentLevel to User interface
- **Types:** Created comprehensive onboarding type system (OnboardingEvaluation, PillarAssessmentResult, etc.)
- **Build:** TypeScript compiles with zero errors, build succeeds

### 2026-03-04 (Session: Dead Code Cleanup & TypeScript Fixes)
- **Refactor:** Deleted ~7,200 lines - backup directories (components_backup/, lib_backup/)
- **Refactor:** Deleted ~1,000 lines - 3 unused video player components (VideoQuizPlayer, VideoQuizPlayerV2, SimpleVideoQuizPlayer)
- **Refactor:** Deleted unused hook (useVideoQuiz.ts), service (mock-data.service.ts), UI component (icon-picker.tsx)
- **Refactor:** Deleted legacy files (page.legacy.tsx, firestore.rules.backup, stage-3 backup docs)
- **Fix:** Converted Jest API to Vitest in all test files (jest.* → vi.*)
- **Fix:** Added Vitest global types to tsconfig.json
- **Fix:** Fixed Firebase User mock type casting in tests
- **Fix:** Fixed logger spread types by ensuring object types before spreading
- **Fix:** Updated Zod enum schemas to use 'message' instead of deprecated 'errorMap'
- **Fix:** Fixed form-template.service.ts argument count and return type
- **Fix:** Fixed dynamic-analytics.service.ts options type and data casting
- **Fix:** Updated DatabaseInitResult interface to match migration service return type
- **Fix:** Fixed error-recovery.ts to use valid ErrorDetails and ApiResponse properties
- **Feature:** Video uploader now loads immediately (removed light prop from ReactPlayer)
- **Feature:** Video uploader detects duration for YouTube/Vimeo via onDuration callback
- **UI:** Improved video quiz creator dialog width (max-w-4xl → max-w-6xl)
- **Build:** All TypeScript errors resolved, clean build verified

### 2026-03-04 (Session: Security Audit & Critical Fixes)
- **Security:** Sanitized .env.example - removed all exposed Firebase credentials and private key
- **Security:** Removed hardcoded admin setup secret fallback ('your-secret-key-here')
- **Security:** Updated Next.js 16.1.4 → 16.1.6 fixing 3 high-severity CVEs (DoS vulnerabilities)
- **Security:** Hardened storage.rules - video-quizzes write now requires admin or coach role
- **Security:** Added isCoach() helper function to storage.rules
- **Config:** Removed dangerous typescript.ignoreBuildErrors from next.config.ts
- **Dependencies:** Moved 5 testing libraries from dependencies to devDependencies
- **Dependencies:** Updated eslint-config-next to match Next.js version
- **Fix:** Fixed unused React import in test-utils.tsx
- **Verification:** npm audit: 0 vulnerabilities, type-check: passes, build: succeeds

### 2026-03-04 (Session: Video Handling System Verification & MIME Type Fixes)
- **Verification:** Confirmed video handling features already implemented (ReactPlayer, URL detection, info messages)
- **Fix:** Corrected MIME types in legacy storage rules (`rules/storage`)
- **Fix:** Removed invalid `video/mov`, `video/avi`, `video/wmv` MIME types
- **Fix:** Added correct `video/x-msvideo` for AVI files
- **Fix:** Added correct `video/x-ms-wmv` for WMV files
- **Verification:** TypeScript compilation clean (no errors)

### 2026-03-04 (Session: Video Quiz Full-Page Conversion & UI/UX Improvements)
- **Feature:** Created full-page quiz creator at `/coach/content/quiz/create` with tab-based layout
- **Feature:** Converted from dialog approach to full-page for better space utilization
- **UI/UX:** Replaced True/False dropdown with visual toggle buttons (green True, red False)
- **UI/UX:** Redesigned Fill in Blank with split input approach (before/after blank fields)
- **UI/UX:** Added live preview for Fill in Blank showing student view
- **Fix:** Updated entry points (content page, curriculum page) to navigate to full-page creator
- **Fix:** Skipped sport/skill validation for coach content (`source: 'coach'`)
- **Fix:** Changed Firestore rules from `isCoach()` to `isCoachOrAdmin()` for quiz creation
- **Fix:** Removed `orderBy` from coach content queries to avoid composite index requirement
- **Security:** Deployed updated Firestore rules to Firebase

### 2026-03-02 (Session: Custom Content Student Access Fixes)
- **Fix:** Updated curriculum sorting to prioritize by status (completed > in_progress > unlocked > locked)
- **Fix:** Added support for custom_lesson and custom_quiz types in student dashboard
- **Fix:** Fixed button text and icons for custom content types
- **Feature:** Created custom lesson viewer page at /learn/lesson/[id]
- **Fix:** Updated Firestore rules - custom_content_library now has public read access
- **Fix:** Made view count increment non-blocking (was causing permission errors for students)
- **Feature:** Added YouTube URL detection and iframe embed support
- **Security:** Deployed Firestore rules updates

### 2026-03-01 (Session: Coach Custom Content Creation System)
- **Feature:** Created video-uploader.tsx with drag-drop, Firebase Storage integration, progress tracking
- **Feature:** Created lesson-creator.tsx with full form fields (title, description, video, content, objectives, tags)
- **Feature:** Created quiz-creator.tsx with 3-step wizard (Info → Video → Questions) using VideoQuestionBuilder
- **Feature:** Created content-type-selector.tsx modal for lesson vs quiz selection
- **Feature:** Built coach content library page at /coach/content with stats, search, filtering
- **Feature:** Created 4 editor pages for lesson/quiz creation and editing
- **Feature:** Added "My Content" tab to content-browser.tsx for coach's library
- **Feature:** Added "Create Custom Content" button to curriculum editor
- **Security:** Added Firestore rules for coach video quiz creation/update/delete (source='coach')
- **Fix:** Removed react-hook-form dependency, used useState for form management
- **Build:** Verified successful build with all new routes

### 2026-02-28 (Session: Curriculum Fixes & Difficulty Level Renaming)
- **Feature:** Added Custom Curriculum link to admin dashboard under Student Support
- **Feature:** Admin dashboard now links directly to `/coach/students` for all students view
- **Fix:** Added static toFirestore/fromFirestore methods to CustomCurriculumService
- **Fix:** Added static toFirestore/fromFirestore methods to CustomContentService
- **Fix:** Added missing getQuizzesBySport method to VideoQuizService
- **Fix:** Fixed content browser dialog overflow (selection summary appearing outside dialog)
- **Refactor:** Renamed difficulty levels from Beginner/Intermediate/Advanced to Introduction/Development/Refinement
- **Migration:** Created and executed data migration script - 48 documents updated (22 sports, 12 skills, 14 quizzes)
- **Types:** Updated DifficultyLevel type and Course interface
- **Validation:** Updated Zod schema for difficulty levels
- **Security:** Updated Firestore rules isValidDifficulty function
- **Data:** Updated all seeding data, mock data, and test files with new difficulty values
- **Scripts:** Added `scripts/migrate-difficulty-levels.ts` with dry-run and revert support
- **Files Modified:** 30+ files across the codebase

### 2026-02-27 (Session: Coach Invitation Auth Fixes)
- **Fix:** Resolved Firestore permission denied error during coach registration
- **Fix:** Fixed race condition between onAuthStateChanged and registration code
- **Fix:** Coach invitation flow now uses context.tsx register instead of auth-service.ts
- **Feature:** Added skipEmailVerification flag for invited coaches
- **Feature:** Clicking invitation link now serves as email verification
- **Feature:** Login checks both Firebase Auth and Firestore emailVerified fields
- **Security:** Updated Firestore rules for coach_invitations to allow acceptance after sign-out
- **Backend:** Register function now returns userId for tracking

### 2026-02-26 (Session: Coach-Student Linking & Dashboard Separation)
- **Feature:** Phase 2.0.3 Coach-student direct linking complete
- **Feature:** Added 4 new UserService methods for coach-student management
- **Feature:** Created StudentSearchDialog component for searching unassigned students
- **Feature:** Coaches can add students to roster via search dialog
- **Feature:** Coaches can remove students from roster with confirmation
- **Feature:** Created CustomCurriculumDashboard for custom workflow students
- **Feature:** Dashboard now differentiates between custom and automated students
- **UI:** Custom students see coach info, curriculum items, and progress
- **UI:** Automated students see self-paced browsing experience
- **Backend:** Validation for workflow type and coach assignment
- **Build:** Verified successful build with all new components

### 2026-02-25 (Session: Session Tracking Dashboard)
- **Feature:** Added development progress dashboard to Project Assistant page
- **Feature:** Created SessionStatsPanel component with phase progress bar
- **Feature:** Displays total sessions count and features built metrics
- **Feature:** Shows recent sessions list with titles and dates
- **Backend:** Created session stats service (pivoted to static data for Vercel)
- **Backend:** Added API endpoint for session statistics (admin-only)
- **UI:** Integrated panel into Project Assistant sidebar
- **Fix:** Handled Vercel serverless constraints with static data approach
- **Build:** Verified successful build and deployment

### 2026-02-24 (Session: Project Assistant)
- **Feature:** Built AI-powered project assistant chatbot for admin dashboard
- **Documentation:** Created comprehensive client documentation system (docs/client/)
- **Documentation:** Wrote 7 detailed docs covering project summary, status, features, routes, progress, decisions
- **Backend:** Implemented ProjectAssistantService with smart document loading (500+ lines)
- **Backend:** Created API route with Anthropic Claude Sonnet 4 integration
- **Backend:** Added Firebase Admin Auth validation and admin role verification
- **Frontend:** Built ChatInterface component with markdown rendering (350+ lines)
- **Frontend:** Added code syntax highlighting with Prism
- **Frontend:** Created 5 suggested questions for quick start
- **UI:** Designed admin page with 2-column responsive layout
- **UI:** Added gradient card to admin dashboard for assistant access
- **Integration:** Connected all components with proper authentication
- **Dependencies:** Installed react-markdown and react-syntax-highlighter
- **Build:** Verified successful build with new routes
- **Cost Optimization:** Smart context loading reduces cost by 80-90%

### 2026-02-23 (Session 3: Content Browser)
- **Feature:** Built comprehensive content browser component for curriculum builder
- **Feature:** Implemented real data loading (sports, skills, quizzes from database)
- **Feature:** Added search functionality with real-time filtering
- **Feature:** Added difficulty level filtering (beginner/intermediate/advanced)
- **Feature:** Created visual content cards with detailed information
- **Feature:** Added selection preview before adding to curriculum
- **Feature:** Implemented dynamic content title loading in curriculum display
- **UI:** Created scroll-area component for content browsing
- **UI:** Sport-specific color coding for visual identification
- **UI:** Responsive design with smooth animations
- **Enhancement:** Replaced 80+ lines of placeholder code with real implementation
- **Build:** Verified successful build with zero errors

### 2026-02-23 (Session 2: Admin Access)
- **Feature:** Extended coach curriculum management access to admins
- **Feature:** Admins can now view and manage any student's custom workflow
- **UI:** Updated navigation to show both "Admin" and "Curriculum" links for admins
- **UI:** Dynamic page titles based on user role
- **Enhancement:** Updated student filtering logic for admin vs coach access
- **Build:** Verified successful build with zero errors

### 2026-02-23 (Session 1: Workflow Types MVP)
- **Feature:** Implemented student workflow type system (automated vs custom)
- **Feature:** Built CustomCurriculumService with full CRUD operations
- **Feature:** Built CustomContentService for coach-created content
- **Feature:** Created coach dashboard with student statistics
- **Feature:** Built coach students list page with progress tracking
- **Feature:** Implemented full curriculum builder interface
- **Feature:** Added workflow type selection to registration flow
- **UI:** Created coach layout with navigation
- **UI:** Updated header navigation for coach role
- **UI:** Built curriculum item management with status badges
- **Security:** Added Firestore rules for custom_curriculum collection
- **Security:** Added Firestore rules for custom_content_library collection
- **Backend:** Added workflow-aware methods to ProgressService
- **Backend:** Integrated curriculum system with user profiles
- **Types:** Created comprehensive curriculum type system
- **Build:** Verified successful build with 3 new coach routes

### 2026-02-22
- **Feature:** Implemented complete coach invitation system with email-based workflow
- **Feature:** Created coach invitation service with token generation and validation
- **Feature:** Built admin UI for managing coach invitations (/admin/coaches)
- **Feature:** Developed coach acceptance flow (/auth/accept-invite)
- **Feature:** Set up email service infrastructure (HTML/text templates, dev mode logging)
- **Feature:** Added invitation resend and revoke functionality
- **Feature:** Implemented invitation status tracking (pending, accepted, expired, revoked)
- **UI:** Created alert-dialog component for confirmation dialogs
- **Security:** Added Firestore security rules for coach_invitations collection
- **Security:** Updated role validation to include coach and parent roles
- **Fix:** Resolved undefined values issue in Firestore documents
- **Deployment:** Successfully deployed to production with all fixes verified
- **Security:** Restricted public registration to Student and Parent roles only
- **Feature:** Implemented crypto-random student ID generation (SG-XXXX-XXXX format)
- **Feature:** Auto-generate student IDs on student registration
- **Feature:** Added student ID display in profile with copy-to-clipboard
- **Feature:** Extended UserRole type to support Coach and Parent roles
- **Feature:** Added role selection dropdown to registration flow
- **Feature:** Updated admin UI to display and manage all four roles
- **Feature:** Implemented role-based redirect logic
- **Testing:** Updated Playwright auth tests for new role UI
- **Branding:** Applied header, footer, logo, colors, and favicon updates
- **Documentation:** Restructured progress tracking with session files
- **Documentation:** Added progress tracking system

### 2026-02-XX (Before tracking)
- Fixed CVE-2025-66478 by updating Next.js to 16.1.4
- Fixed analytics display with undefined filterStatus removal
- Exported dynamicChartingService from database index
- Added dynamic form analytics display

---

## 📋 Session Workflow

### For Every Work Session:

1. **At Session Start:**
   - Review current sprint goals above
   - Check "Next Steps" from most recent session in `docs/sessions/`
   - Note your start time

2. **During Session:**
   - Track tasks as you complete them
   - Note any blockers or decisions
   - Keep list of modified files

3. **At Session End (MANDATORY):**
   - Create new session file in `docs/sessions/YYYY-MM/` using `template.md`
   - Add session summary to "Recent Sessions" section above
   - Update time tracking summaries
   - Update milestone progress percentages if applicable
   - Update sprint goals if tasks completed
   - Commit PROGRESS.md AND session file together

### Session File Naming Convention:
`docs/sessions/YYYY-MM/YYYY-MM-DD-short-descriptive-title.md`

**Examples:**
- `docs/sessions/2026-02/2026-02-22-progress-tracking-setup.md`
- `docs/sessions/2026-02/2026-02-23-multi-role-auth-implementation.md`
- `docs/sessions/2026-03/2026-03-01-pillar-conversion-phase1.md`

### Time Tracking Guidelines:
- Round to nearest 15 minutes
- Include all work: coding, debugging, testing, documentation
- Exclude: breaks, context switching, unrelated work
- Be honest and accurate

---

## 📞 Quick Reference

**Last Updated:** 2026-03-12
**Last Session:** Test Import Path Fixes
**Total Sessions This Phase:** 42
**Current Phase Hours:** 58h
**Next Session Focus:** Block 1.6 - Dashboard Visualization + Integration

---

## 📂 Documentation Structure

```
PROGRESS.md                           # This file - high-level dashboard
docs/
  └── sessions/                       # Individual session logs
      ├── template.md                 # Template for new sessions
      └── YYYY-MM/                    # Sessions organized by month
          ├── YYYY-MM-DD-title.md
          └── ...
```

---

## 🔍 Finding Information

- **Current Status:** See "Project Status" and "Current Sprint Goals" above
- **Time Spent:** See "Time Tracking Summary" above
- **Recent Work:** See "Recent Sessions" above (last 5-10 sessions)
- **Detailed Session Info:** Navigate to `docs/sessions/YYYY-MM/YYYY-MM-DD-title.md`
- **All Sessions:** Browse `docs/sessions/` directory
- **Decisions Made:** See "Recent Decisions" above or search session files
- **Technical Debt:** See "Known Issues & Technical Debt" above

---

**Session File Template:** [`docs/sessions/template.md`](docs/sessions/template.md)
