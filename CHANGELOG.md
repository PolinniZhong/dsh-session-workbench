# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-09-07

> 修复：会话视图的隐藏/排序不再误伤设置弹层内其它插件的同数量 tab 条（曾致 dsh-personal-center 设置页「外观/宠物」两个 tab 被隐藏）。

### Fixed

- **作用域限定会话视图标签条** — `applyViewConfig` 原遍历全文档所有 `[role=tablist]`，凡 tab 数量等于会话视图数即按位置映射绑定 `data-view-id` 并应用「隐藏/排序」。设置弹层内其它插件页面若有同数量 tab 条（如 dsh-personal-center 的 4 个 tab 对 4 个会话视图），会被当作会话视图条，按位置绑到已隐藏视图的 tab 被 `display:none` 隐藏。现新增 `isConversationViewTablist` 守卫：跳过位于覆盖层/对话框内的 tablist；右键菜单取标签条同样改为取「会话工作区内第一个合格 tablist」，不再取全文档第一个。
- **守卫改为类名无关的祖先判定** — 覆盖层根类随 dsh 壳改版更名（`.dsh-tu-settingsRoot` → `.dshp-settings-sidebar`），固定类名名单会失效导致误伤复发；现改为「任一祖先类名含 `settings` 即视为设置弹层内容」的判定，配合 `[role=dialog]` / `[aria-modal=true]`，不依赖具体类名。

## [1.0.1] - 2026-09-05

> 兼容性修复：适配 DSH 0.1.1-rc.2 的 client 模块重组。无新功能，行为不变。

### Fixed

- **DSH 0.1.1-rc.2 compatibility** — removed `@deepseek-ai/dsh-client-ui-slots` from `dsh.client.inject`: the module no longer ships separately in rc.2 (its API merged into `dsh-client-ui-conversation`, and `ctx.slots` is now provided by `dsh-client-runtime`). The stale inject made the client bundle fail to ready (`HARNESS_NOT_READY: ... (0/2 ready)`) and block the app from starting; inject is now `[dsh-client-runtime, dsh-client-locale, dsh-client-ui-conversation]`.

## [1.0.0] - 2026-08-30

> 更名 + 合并首发：从「会话库 dsh-session-kb」升级为「会话工作台 dsh-session-workbench」——一个插件、三个入口（侧边栏·会话库 / 设置·会话库 / 设置·会话视图）。版本号从 0.3.0 跳到 1.0.0，标记形态变化（合并）而非功能增量。

### Added

- **会话视图（设置页）** — 新增「设置 → 会话视图」子页：枚举 `conversation.view` 已挂载视图，每个视图提供「显示/隐藏」开关 + `⋮⋮` 把手拖拽排序（HTML5 DnD；隐藏视图不可拖、排在显示之后，按隐藏时间序）；
- **会话视图（标签条面板）** — 右键/双击会话标签条弹出「会话视图」面板：开关 + 拖拽排序，与设置页同款交互；被拖项半透明幽灵、落点行品牌色虚线描边（pointer + transform 实现，可靠不抖动）；
- 包名/显示名/描述统一为「会话工作台 dsh-session-workbench」，描述与检索词同时埋「会话库 + 会话视图」双关键词。

### Changed

- 包 `dsh-session-kb` → `dsh-session-workbench`；cordis 插件行 `session-kb` → `session-workbench`；
- 会话视图隐藏/排序走 **DOM 层**（不改其它视图插件源码）：`ctx.slots.entries('conversation.view')` 枚举 + `style.order` 视觉排序 + `display:none` 隐藏 + MutationObserver 重放；
- 会话库既有功能（搜索 / 片段命中 / 定位 / 召回 / 归档）保持不变，回归通过。

### Fixed

- 标签条直接拖拽不可靠（React 拥有 `tablist`，DOM 重排会被复位）→ 放弃标签条直拖，排序收敛到「面板 + 设置页」两处。

## [0.3.0] - 2026-08-25

### Added (v1.2 / same-session hits + reliable locate anchors)

- **Same-session multi-hits** — expanding a fragment card now shows a "More hits in this session (N)" fold with the other matches (first 5 by default, "Load more" via cursor pagination), each with keyword highlighting — no more hunting for the rest of a session's matches;
- **Composite locate anchors** — Locate now matches the hit sentence *plus* the preceding event text (within the previous 1–3 DOM rows), so repeated text lands on the right occurrence instead of the earliest one;
- **Index-building notice** — when a search exceeds ~2.5s (first index build), the loading state explains that the history index is being built instead of an open-ended "Loading…".

### Fixed

- Keyword highlighting was silently broken in expandable context / same-session hits / titles (`<mark>` HTML was escaped as plain text) — now rendered via `dangerouslySetInnerHTML` (escaped first, no XSS);
- Same-session cache was keyed by session only, so switching search terms could show the previous term's hits — cache now bound to `sessionId:query`;
- `searchEvents` endpoint now uses the same 30s TTL cache as search (avoids repeated full reconciliation);
- README install example now uses an **absolute** index path — the platform does not expand `~` (a `~/.dsh/...` path silently writes into the dependency tree, losing the index on upgrade and accumulating a huge WAL that makes searches take minutes).

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
