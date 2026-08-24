# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-24

### Added (v1.1 / snippet-level retrieval)

- **Fragment cards** — search results upgraded from "one row per session" to per-session best-hit fragment cards: the matched sentence highlighted, with a lazy-loaded context window (surrounding events via `readEvent`);
- **Locate to the message** — click **Locate** on a fragment card to open that session, page the window back to the hit (`open` + `loadOlder`), then scroll to the matching message row and flash-highlight it (best-effort text match; degraded to a non-blocking toast when the hit is out of range or unmatched);
- **Sort switch** — search results sort by relevance (default) or latest-first.

### Performance

- Persistent SQLite FTS index (`path: '~/.dsh/session-query.sqlite'`, `openAt: startup`) — no more full reconcile on every search;
- Host 30s TTL cache for identical searches;
- Recent sessions list and result titles now come from the client-local `sessions.list` snapshot — zero per-session log reads (the 27s slow path is gone).

### Removed

- Dead host endpoints `/session-kb/sessions` and `/session-kb/session/:id` (superseded by the client-local recent list).

## [0.1.0] - 2026-08-21

### Added (v1.0 / MVP)

- **Search** — full-text search across all past sessions (all workspaces) via the official SQLite FTS5 index (`ctx.sessionQuery`), with highlighted hit snippets, workspace / time-range filters, and cursor pagination;
- **Recall** — pick up to 3 sessions and insert them into the input as reference chips (`slash/input-insert-reference`); on send the platform injects read-only snapshots (`## Referenced sessions`);
- **Recent** — minimal recent-sessions list (creation-time desc, paginated);
- **Archive support** — search includes archived sessions by default (with an "Archived" badge and all / active-only / archived-only filters); the Recent list excludes archived sessions by default;
- **Settings section** — enable/disable switch + default search scope + privacy statement (card with click-to-expand, native-feeling UI);
- **better-sidebar integration** — "Session KB" tab via `ctx.betterSidebar.registerTab`; tab title follows the UI locale;
- **Host loopback routes** — `/session-kb/search`, `/session-kb/sessions`, `/session-kb/session/:id`, `/session-kb/settings`, all with `isLoopback` checks;
- Bilingual UI (zh/en) following the DSH design system; README / PRIVACY in English (with a Chinese summary).

### Technical validation (M0)

- T1 `insertReference` ref structure — confirmed;
- T2 search pagination cursor — confirmed smooth on large result sets (~14ms first page);
- T3 better-sidebar `registerTab` docking — confirmed;
- T5 compacted (shadowed) session content searchable — confirmed at source level.
