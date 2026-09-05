# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LeaveEasy is a student lab project for ADT-RAISE Non-Degree Batch 2, Module 2 (weeks 6–9): a plain HTML/CSS/JS prototype of an online leave-request system, built incrementally week by week and graded on the learner's own fork.

**`leaveeasy-spec.md` is the authoritative spec — read it before making any non-trivial change.** It defines the data schema, field names, the 3 user roles, the leave-request status state machine, seed data, and — critically — **section 8 (weekly scope) and section 9 (explicit non-goals)**. Do not implement a feature from a future week or from section 9's exclusion list, even if it seems like an obvious improvement; flag it as a suggestion instead and wait for instruction. If a summary of the spec doesn't match what's implemented, fix the spec or ask before writing screens.

## Commands

```bash
npm run dev   # serve -l 3000 .  (static file server, no build step)
```

- Open the app via the `leaveeasy` launch config (`.claude/launch.json`), which runs `npm run dev` on port 3000.
- There is no build, lint, or test command — this is unbundled static HTML/CSS/JS loaded directly by the browser.
- Seed Firestore with the canonical sample data (idempotent, safe to re-run):
  ```bash
  node scripts/seed-firestore.mjs
  ```

## Architecture

**No framework, no bundler, no custom backend.** Pages talk to Firestore directly from the browser. One `.html` file = one screen; shared chrome and helpers live in `css/style.css`, `js/nav.js`, and `js/util.js`.

- `js/firebase-init.js` — the single Firestore connection point. Imports the Firebase SDK from the `gstatic.com` CDN (v10.14.1, ES modules) and exports `db`. Any page/script that touches Firestore imports `db` from here rather than re-initializing the app. The `firebase` npm dependency is used only by `scripts/seed-firestore.mjs` (a Node script), not by the browser pages.
- `js/nav.js` — renders the shared top nav into `<div id="nav"></div>` on every page from one menu array; also defines the global `showConfigWarning()` helper for pages not yet wired to Firebase.
- `js/util.js` — global (non-module) helpers used across pages: `esc()` for HTML-escaping before interpolation, `ป้ายสถานะ()` for the colored status badge, `เวลาตอนนี้()` for a sortable `YYYY-MM-DD HH:mm` timestamp string, `ค่าจากURL()` for reading a query param.
- `js/data.js` — `window.LEAVE_DATA`, hardcoded sample data whose field names and shapes mirror the real Firestore documents exactly. Several pages still read from this instead of Firestore (see migration state below).
- **Identifiers throughout this codebase are Thai** (variable/function names, not just comments/strings) — match this convention when editing existing files rather than switching to English mid-file.

### Data model (Firestore)

All Firestore collections ("folders") in this project — there are no others, don't invent one without updating the spec first:

| Collection | Docs example | Notes |
|---|---|---|
| `users` | `u001`, `u002`, `u003` | `name`, `email`, `role` (`employee` / `manager` / `hr`) |
| `leaveTypes` | `lt001`, `lt002`, `lt003` | `name` |
| `leaveRequests` | `lr001` … | the main collection; see §5.2 of the spec for full fields |
| `leaveRequests/{id}/approvals` | `ap001` … | subcollection nested under each leave request, not top-level |

Full field-by-field reference is in `leaveeasy-spec.md` §5. Key points to keep in mind when touching this data:

- Field names are case-sensitive and must match exactly across every file that reads/writes them (`status` vs `Status` would silently break things).
- Names are deliberately denormalized: `leaveRequests` documents duplicate `requesterName`, `approverName`, and `leaveTypeName` (and `approvals` duplicate `authorName`) alongside their `*Id` reference, because Firestore has no JOIN. When creating/updating a document that has an `*Id` field, also set its matching `*Name` field from the same lookup.
- `scripts/seed-firestore.mjs` and `js/data.js` must be kept in sync with `leaveeasy-spec.md` §7's sample data — they're intentionally the same dataset in three representations (spec doc, static JS fixture, seed script).

### Leave request status (3 values only)

`status` on a `leaveRequests` document is a one-way state machine with exactly these 3 values:

1. `รอพิจารณา` (pending) — the only starting value; set automatically on creation, never chosen by the user.
2. `อนุมัติ` (approved) — terminal, cannot change further.
3. `ไม่อนุมัติ` (rejected) — terminal, cannot change further; requires at least one existing `approvals` entry before it can be set.

Only `รอพิจารณา → อนุมัติ` or `รอพิจารณา → ไม่อนุมัติ` transitions are valid — never backwards, never any other value. A status change must touch only the `status` field on the document — never rewrite the rest of it.

### Secrets — never commit keys to a pushed file

- **Do not add API keys, tokens, or credentials to any file that gets committed/pushed** (this includes `.env` files, scripts, or hardcoding a new secret into a `.js`/`.html` file). If a task needs a secret (e.g. an OpenRouter key for the Week 8 AI feature), ask the user how they want it supplied (local `.env` ignored by git, a Firebase Functions config, etc.) rather than writing it into a tracked file.
- The Firebase `apiKey`/config object already committed in `js/firebase-init.js` and `scripts/seed-firestore.mjs` is an exception, by design: per the comment in that file, a Firebase Web config is not a secret like a password — access control is enforced by Firestore Security Rules, not by hiding this value. Don't remove or "fix" it as if it were a leaked credential.

### Current migration state (mid Week 6 — read data.js/live status per page, don't assume)

The app is partway through moving off `js/data.js` fake data onto live Firestore reads, per the week-by-week plan in spec §8. As of now:

- `leave-requests.html` / `js/leave-requests.js` reads real documents from Firestore (`getDocs(collection(db, "leaveRequests"))`), merged with anything just submitted this session via `sessionStorage` (writes to Firestore aren't implemented yet).
- `new-leave-request.html`, `leave-request-detail.html`, `leave-types.html` still read from `window.LEAVE_DATA` and mutate only in-memory/`sessionStorage` state — nothing they do persists across a real reload except via the `leave-requests.js` merge trick above.
- There is no login yet (spec §2, §8 week 7) — pages that need a "current user" hardcode one (e.g. `new-leave-request.js` assumes the requester is `u001`, `leave-request-detail.js` assumes the comment author is `u002`). Don't build role-based access control before Week 7/8 lands per spec.

Before changing how a page fetches or writes data, check what that specific page currently does (Firestore vs `LEAVE_DATA` vs `sessionStorage`) rather than assuming from another page.
