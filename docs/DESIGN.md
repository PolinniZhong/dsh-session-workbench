# dsh-session-workbench — Implementation Design

> Version: 1.0.0 ｜ Updated: 2026-08-30 ｜ Status: in sync with the code (lib/index.js + lib/client.js)
> Developer-facing implementation notes; product scope in the 会话工作台 PRD/SDD, visual spec in DESIGN-SYSTEM.md.

## 1. Package layout

```
dsh-session-workbench/
├── package.json          # name=dsh-session-workbench; dsh.bundle.patch=cordis.patch.yml;
│                         # dsh.client.platform=web; exports["./client"]
├── cordis.patch.yml      # plugin row (insert: session-workbench)
├── lib/
│   ├── index.js          # host: loopback routes /session-kb/* + settings namespace (session-kb, incl. views)
│   └── client.js         # client: better-sidebar tab + settings entry (会话库/会话视图) + tab-bar view panel
├── docs/                 # DESIGN-SYSTEM.md (visual) / DESIGN.md (this file)
├── README.md / PRIVACY.md / CHANGELOG.md
```

## 2. Host (lib/index.js)

### 2.1 Loopback routes (webServer.register + isLoopback)

| Route | Method | Params | Description |
|---|---|---|---|
| `/session-kb/search` | GET | `q, ws, from, to, archived, limit, cursor` | FTS search; archive filtering applied at the result layer |
| `/session-kb/context` | GET | `sessionId, seq` | Read the surrounding event window (≤50) for a fragment hit |
| `/session-kb/settings` | GET/POST | `{enabled, scope, views}` | Settings read/write (`settingsNamespace("session-kb")`) |

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

- Namespace `session-kb`: `{ enabled: boolean, scope: "all"|"current", views: {hidden:string[], order:string[]} }`;
- Read/write via the loopback route (bypasses the web settings whitelist, goes straight to `ctx.settings`);
- `views` uses `.default({hidden:[],order:[]})` — **schemastery has no `.optional()`**;
- The client tab is **always registered**: when `enabled=false` the tab shows an internal disabled notice — the switch only controls feature availability.

## 3. Client (lib/client.js)

### 3.1 Component structure

- `SessionKbTab` — the better-sidebar tab panel (header row + list + picked bar);
- `SettingsSection` — 会话库 partition (card + right-side switch + click-to-expand);
- `SessionViewsManager` — 会话视图 partition (switch + HTML5 DnD reorder);
- `SessionWorkbenchSettings` — single settings entry stacking the two partitions above;
- `showViewMenu` — tab-bar popover panel (switch + pointer/transform drag);
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

### 3.4 Conversation views (new in 1.0.0)

- `BASE_VIEW_IDS = ['chat','trajectory']` — base views, never listed/managed;
- `SessionViewsManager` — settings partition: enumerate `ctx.slots.entries('conversation.view')`, filter base views, each custom view = `⋮⋮` drag handle + name + `skb-switch`; reorder via React HTML5 DnD (hidden rows not draggable);
- `showViewMenu(x,y)` — right-click/double-click the tab bar to open a popover panel with the same switch + drag; drag uses **pointer + transform** (`setPointerCapture` + `translateY` + gap shift), more reliable than HTML5 DnD;
- `applyViewConfig(config)` — DOM applier: bind `data-view-id`, hide via `display:none`, reorder via **`style.order`** (NOT `insertBefore` — React owns the tablist and resets DOM reordering), `user-select:none` on tabs/panel; replay via MutationObserver;
- Sort order: visible first (by config `order`), hidden last (by `hidden` array order = hide time);
- Drag visuals: dragged row `opacity:0.6` + shadow (ghost); target row `1px dashed` brand color + `box-sizing:border-box` (no size shift);
- Settings entry: single `settings.section` entry (id `session-kb`, order 30) stacking `SettingsSection` + `SessionViewsManager`.

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
6. Don't render the empty state while the initial loading flag isn't set yet (loading takes precedence);
7. Dragging the tab bar directly is unreliable (React owns the `tablist`, DOM reordering gets reset by `useSyncExternalStore`) — reorder via `style.order` instead, and put drag-and-drop in the panel/settings.

## 6. Related docs

- Visual spec: `docs/DESIGN-SYSTEM.md`
- Product scope: `../会话工作台-PRD.md`; technical design `../会话工作台-SDD.md`
- Technical design: `../会话工作台-SDD.md`
- Platform notes: `../docs/PLATFORM-NOTES.md`
