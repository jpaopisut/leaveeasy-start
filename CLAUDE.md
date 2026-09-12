# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LeaveEasy is a student lab project for ADT-RAISE Non-Degree Batch 2, Module 2 (weeks 6–9): a plain HTML/CSS/JS prototype of an online leave-request system, built incrementally week by week and graded on the learner's own fork.

**`leaveeasy-spec.md` is the authoritative spec — read it before making any non-trivial change.** It defines the data schema, field names, the 3 user roles, the leave-request status state machine, seed data, and — critically — **section 8 (weekly scope) and section 9 (explicit non-goals)**. Do not implement a feature from a future week or from section 9's exclusion list, even if it seems like an obvious improvement; flag it as a suggestion instead and wait for instruction. If a summary of the spec doesn't match what's implemented, fix the spec or ask before writing screens.

## Commands

```bash
npm run dev   # serve .  (static file server, no build step)
```

- Open the app via the `leaveeasy` launch config (`.claude/launch.json`), which runs `npm run dev` on port 3000 with `autoPort: true` (falls back to a random free port if 3000 is taken — check the actual URL the tool reports rather than assuming 3000).
- `serve.json` sets `"cleanUrls": false` — without it, `serve` 301-redirects `foo.html?x=1` to `/foo` and **drops the query string**, which silently breaks every page that reads an `id`/`status` param from the URL (e.g. `leave-request-detail.html?id=...`). Don't remove this file.
- There is no build, lint, or test command — this is unbundled static HTML/CSS/JS loaded directly by the browser.
- Seed Firestore with the canonical sample data (idempotent, safe to re-run):
  ```bash
  node scripts/seed-firestore.mjs
  ```
  This script writes as an unauthenticated client. **`firestore.rules` is now deployed** (see Authentication below) and rejects unauthenticated writes, so this script **will fail as-is** — it needs to be updated to sign in first (e.g. `signInWithEmailAndPassword` with a test account) before it can seed/reseed data.

## Architecture

**No framework, no bundler, no custom backend.** Pages talk to Firestore directly from the browser. One `.html` file = one screen; shared chrome and helpers live in `css/style.css`, `js/nav.js`, and `js/util.js`.

- `js/firebase-init.js` — the single Firebase connection point. Imports the SDK from the `gstatic.com` CDN (v10.14.1, ES modules) and exports both `db` (Firestore) and `auth` (Authentication). Any page/script that touches Firestore or Auth imports from here rather than re-initializing the app. The `firebase` npm dependency is used only by `scripts/seed-firestore.mjs` (a Node script), not by the browser pages.
- `js/auth-guard.js` — the single place page scripts call into for auth. Exports `ต้องล็อกอิน()` (call as the first line of any page script that needs a signed-in user — awaits Firebase's auth-state restore, redirects to `login.html` and resolves `null` if signed out, otherwise resolves `{uid, name, role, email}` after reading `users/{uid}`), `ผู้ใช้ปัจจุบัน()` (identical profile resolution but never redirects — resolves `null` on signed-out instead; for pages/UI that should render either way, like `nav-user.js`), `ออกจากระบบ()` (signs out + redirects to `login.html`), and `ข้อความผิดพลาดล็อกอิน(err)` (maps Firebase Auth error codes to Thai messages). `login.js`/`signup.js` also use the error-mapper.
- `js/nav.js` — renders the shared top nav into `<div id="nav"></div>` on every page from one menu array; also defines the global `showConfigWarning()` helper for pages not yet wired to Firebase. Deliberately NOT auth-aware and NOT a module — kept classic/sync so it has zero dependency on Firebase loading first.
- `js/nav-user.js` — a small separate module (loaded alongside `nav.js` on every page) that fills the `#navUser` placeholder `nav.js` already reserves: signed in → "สวัสดี, {name}" + logout button; signed out → login/signup links. Also removes the "ประเภทการลา" nav link outright (via `querySelector('a[href="leave-types.html"]').remove()`) unless the signed-in user's role is `hr`, per `ACL.md`. Kept separate from `nav.js` on purpose (see above).
- `js/util.js` — global (non-module) helpers used across pages, **including by `js/nav-user.js`**: `esc()` for HTML-escaping before interpolation, `ป้ายสถานะ()` for the colored status badge, `เวลาตอนนี้()` for a sortable `YYYY-MM-DD HH:mm` timestamp string, `ค่าจากURL()` for reading a query param. Because `nav-user.js` needs `esc()`, **every page that loads `nav-user.js` must also load `js/util.js` before it** (index/login/signup previously didn't and threw `esc is not defined` until fixed — don't drop this tag when adding a new page).
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
| `leaveRequests/{id}/aiLog` | auto-id | subcollection logging every AI call made against that request (`input`, `output`, `createdAt`) — added week 8, see [js/leave-request-detail.js](js/leave-request-detail.js) |

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

### Authentication (Firebase Auth, email/password)

- `login.html`/`js/login.js` and `signup.html`/`js/signup.js` are the two auth screens. Signup calls `createUserWithEmailAndPassword`, `updateProfile` (sets `displayName` so nav/pages never need an extra Firestore read just to show a name), then `setDoc(doc(db, "users", uid), {name, email, role: "employee"})` — **role always defaults to `employee` at signup**, matching spec US-08. Both screens redirect to `leave-requests.html` on success.
- `leave-requests.html`, `new-leave-request.html`, and `leave-request-detail.html` all call `await ต้องล็อกอิน()` (from `js/auth-guard.js`) as the first thing their page script does, and `return` immediately if it resolves `null` (already redirected). `requesterId`/`authorId` on new leave requests and comments now come from this real signed-in user (`ผู้ใช้.uid`/`ผู้ใช้.name`), not the old hardcoded `u001`/`u002`.
- `leave-types.html` now also calls `ต้องล็อกอิน()` — not because it touches Firestore (it still doesn't, see migration state below), but purely to read `role` and gate the page to `hr` (see Role-based UI restrictions below).
- `index.html` is intentionally public (no guard) — it has no Firestore reads, just static links/copy. It still loads `nav-user.js` so the nav shows the right login state.
- `firestore.rules` + `firebase.json` + `.firebaserc` — the minimum "must be logged in" rule per spec's Week 7 milestone. **Deployed** (`firebase deploy --only firestore:rules` has been run against `leaveeasy-jakrapan`, verified with an unauthenticated `curl` against the REST API returning `403 PERMISSION_DENIED`). The rule is a single wildcard match (`match /{document=**} { allow read, write: if request.auth != null; }`) covering every collection — no per-owner/per-role checks, those are Week 8. Firestore now rejects ALL reads/writes from anyone not signed in, including `scripts/seed-firestore.mjs` (which authenticates as nothing) — **re-run seeding only while signed in, or update the script to authenticate first, or temporarily relax the rule** if you need to reseed.

### Role-based UI restrictions (client-side only — see `ACL.md`)

`ACL.md` is the source of truth for what each of the 3 roles (`employee`/`manager`/`hr`) can and can't do. As of now the following is enforced **in the UI only**:

- `js/leave-requests.js` filters the table to `requesterId === ผู้ใช้.uid` when `role === "employee"`; `manager`/`hr` see everything.
- `js/leave-request-detail.js` shows a denial message instead of the request (before even calling `วาดใบลา()`) if `role === "employee"` and the request isn't the viewer's own. The อนุมัติ/ไม่อนุมัติ buttons only render for `manager`/`hr`. The ลบใบลา button is gated on **ownership** (`ใบ.requesterId === ผู้ใช้.uid`), not role — matching `ACL.md`'s "cannot delete someone else's request" rule, which applies to every role equally.
- `js/leave-types.js` / `leave-types.html` render an "hr only" message and stop (no table, no listeners wired) unless `role === "hr"`. `js/nav-user.js` also removes the "ประเภทการลา" link from the nav for non-`hr` users.

**None of this is enforced by Firestore Security Rules** (which, per above, only require login — nothing per-role or per-owner, and aren't even deployed yet). Anyone opening devtools and calling the Firestore SDK directly bypasses all of it. Real enforcement is Week 8 scope. Don't treat these checks as a security boundary — they're UX only, matching what the user explicitly asked for.

### Migration state — which pages are still on fake data

The app is partway through moving off `js/data.js` fake data onto live Firestore reads/writes, per the week-by-week plan in spec §8. As of now:

- `leave-requests.html` / `js/leave-requests.js` reads real documents from Firestore (`getDocs(collection(db, "leaveRequests"))`).
- `new-leave-request.html` / `js/new-leave-request.js` **writes a real document** to `leaveRequests` via `addDoc` (status always `รอพิจารณา`, `id` left to Firestore to generate) and redirects to `leave-requests.html` on success.
- `leave-request-detail.html` / `js/leave-request-detail.js` looks up the request in **Firestore first** (`getDoc`, plus a `getDocs` on the `approvals` subcollection) — this must stay Firestore-first now that the approve/reject buttons write real status changes; checking `window.LEAVE_DATA` first would silently show stale status for the 5 seeded sample IDs after they're approved/rejected. `window.LEAVE_DATA` is only a fallback for when the request isn't found in Firestore (e.g. `scripts/seed-firestore.mjs` hasn't been run yet). The **"อนุมัติ"/"ไม่อนุมัติ" buttons write a real `updateDoc(doc(db, "leaveRequests", id), { status: ... })`** — only the `status` field. The **"ลบใบลา" button** (shown only when `status === "รอพิจารณา"`, after a native `confirm()`) does a real `deleteDoc` — note it does NOT clean up the `approvals` subcollection (Firestore doesn't cascade-delete; orphaned subcollection docs are a known, accepted gap). **New comments (`ส่งความเห็น`) still only mutate in-memory state** — not written back to Firestore yet (that's Week 7's US-05).
- `leave-types.html` still reads from `window.LEAVE_DATA` and mutates only in-memory state — nothing persists across reload.

Before changing how a page fetches or writes data, check what that specific page currently does (Firestore read, Firestore write, or `LEAVE_DATA`-only) rather than assuming from another page.
