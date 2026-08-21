# dsh-session-kb — Implementation Design

> Version: v1.0 ｜ Updated: 2026-08-21 ｜ Status: in sync with the code (lib/index.js + lib/client.js)
> Developer-facing implementation notes; product scope in the v1.0 PRD, visual spec in DESIGN-SYSTEM.md.

## 1. Package layout

```
dsh-session-kb/
├── package.json          # name=dsh-session-kb; dsh.bundle.patch=cordis.patch.yml;
│                         # dsh.client.platform=web; exports["./client"]
├── cordis.patch.yml      # plugin row (insert: session-kb)
├── lib/
│   ├── index.js          # host: loopback routes /session-kb/* + settings namespace
│   └── client.js         # client: better-sidebar tab + settings section (zh/en)
├── docs/                 # DESIGN-SYSTEM.md (visual) / DESIGN.md (this file)
├── README.md / PRIVACY.md
```

## 2. Host (lib/index.js)

### 2.1 Loopback routes (webServer.register + isLoopback)

| Route | Method | Params | Description |
|---|---|---|---|
| `/session-kb/search` | GET | `q, ws, from, to, archived, limit, cursor` | FTS search; archive filtering applied at the result layer |
| `/session-kb/sessions` | GET | `ws, archived, limit, offset` | Recent sessions (archived excluded by default) |
| `/session-kb/session/:id` | GET | — | Session detail (title/cwd/time/duration/event count) |
| `/session-kb/settings` | GET/POST | `{enabled, scope}` | Settings read/write (`settingsNamespace("session-kb")`) |

Every route first checks `isLoopback(req.socket.remoteAddress)` — non-loopback requests get 403.

### 2.2 Search & pagination (handleSearch)

```js
// "all" mode (default, includes archived): keep the user limit, pass through the official FTS cursor
sessionQuery.searchSessions({ query, sessionFilters, limit, cursor? })
// Archive-filter mode (active/archived): fetch up to MAX_LIMIT=100, filter locally, return all; no cursor
```

- `sessionFilters`: `{kind:"cwd",values:[ws]}`、`{kind:"created-at",from,to}`;
- Batch title lookup: `readTitleSnapshots(sessionIds)` (`foldSessionTitle` returns `{title,...}`);
- Archived set: `readArchivedSessionIds(documentPath)` → `global.archivedSessionIds` in `workspace.json`, same source as dsh-personal-center.

### 2.3 Insert-reference flow (client → platform)

```
check a result → makeMention(sessionId, label) builds the canonical mention
  → insertReferences(ctx, sessionId, picks)
    → ctx.sessions.scope(sessionId) gets the session-scoped ctx
    → conversation.input.for(actx) gets the input shell
    → before each insert, read snapshot.draft/draftRev to build span (append at end of draft)
    → actx.bail(actx, "slash/input-insert-reference", { reference, span })
      reference = { source:"reference", ref: mention, label, appearance:"session", clipboardText }
```

On the platform side (dsh-client-ui-conversation), the scoped ctx listens for `slash/input-insert-reference` → `shell.insertReference` → the input renders a chip; on send, dsh-session-reference parses the mention → injects the read-only snapshot.

### 2.4 Settings

- Namespace `session-kb`: `{ enabled: boolean, scope: "all"|"current" }`;
- Read/write via the loopback route (bypasses the web settings whitelist, goes straight to `ctx.settings`);
- The client tab is **always registered**: when `enabled=false` the tab shows an internal disabled notice — the switch only controls feature availability.

## 3. Client (lib/client.js)

### 3.1 Component structure

- `SessionKbTab` — the better-sidebar tab panel (header row + list + picked bar);
- `SettingsSection` — settings section (card + right-side switch + click-to-expand);
- `SessionKbIcon` / `SearchIcon` / `MoreIcon` — outline icons (`currentColor`).

### 3.2 State & views

- View is state-driven: `query` non-empty → search results; empty → recent sessions (no tab bar);
- Filters: `wsFilter` / `rangeFilter` / `archivedFilter` (grouped picks in the more menu);
- Pagination: search "all" mode uses the FTS cursor (`nextCursor`); recent uses offset (`nextOffset`);
- Picks: `picks` (≤3), `makeMention` builds the canonical mention;
- Picked bar: **always visible** (insert button disabled but shown when nothing is picked).

### 3.3 Dependencies & injection

- `inject: ["slots", "locale"]` (betterSidebar is optional — read via `ctx.get`, guard for undefined);
- Client bundle injects: `dsh-client-runtime / dsh-client-locale / dsh-client-ui-slots / dsh-client-ui-conversation`.

## 4. Archive semantics (new in v1.0)

| View | Default | `archived` param |
|---|---|---|
| Search | includes archived (`all`) | all=incl. archived / active=only active / archived=only archived |
| Recent | excludes archived (`active`) | explicit `all`=incl. archived / `archived`=only archived |

Implementation notes:
- The archived set is aggregated read-only on the host; FTS does not distinguish archives → filtered at the result layer;
- **cursor × filter conflict**: filter mode does NOT use the FTS cursor (see design doc §4) — fetch up to MAX_LIMIT once and filter locally;
- Client result row `item.archived` → shows the "Archived" badge; the filter lives in the more menu.

## 5. Known pitfalls (measured during development)

1. `registerTab` is a **client** service; the descriptor component needs React (`require("react")`);
2. Inserting a reference requires a span (`{draftRev,start,end}`) or the CAS fails; insert multiple references one by one, re-reading the snapshot each time;
3. The FTS cursor is bound to the request fingerprint: changing query/filters/limit → `SESSION_QUERY_STALE_CURSOR`;
4. An absolutely-positioned `.skb-menu` must not live inside an `overflow:hidden` container (it gets clipped);
5. The settings switch must not gate tab registration (the entry should always exist);
6. Don't render the empty state while the initial loading flag isn't set yet (loading takes precedence).

## 6. Related docs

- Visual spec: `docs/DESIGN-SYSTEM.md`
- Product scope: `../会话知识库插件-v1.0-PRD.md`
- Platform notes: `../docs/PLATFORM-NOTES.md`
