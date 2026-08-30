# Privacy

`dsh-session-workbench` (Session Workbench) is a **local-only** DeepSeek Harness plugin with two parts: **会话库** full-text searches your own past sessions and lets you recall selected sessions to the AI as `@references`; **会话视图** manages the conversation-view tab bar (show/hide + reorder). All data processing happens on your own device — **nothing is uploaded to any third-party server**.

## Data read & search

- Search uses DSH's **built-in** SQLite FTS5 full-text index (`ctx.sessionQuery`, read-only). The index is maintained by DSH itself; this plugin **builds no index of its own and copies nothing**;
- Only **session metadata** (title / workspace / creation time / hit-event time) and **hit snippets** (the official engine's `snippet`, i.e. a short window around the match) are read, for the list and preview UI;
- The **full session body is never read, stored, or uploaded** — body text is matched only inside the official local index, and the plugin only receives the engine's trimmed hit fragment;
- **No session is modified or deleted** (read-only search + recall, per PRD §10).

## Reference recall

- The session references you pick and insert are, on send, turned into read-only snapshots injected into the model context by the DSH platform (`## Referenced sessions`) — exactly the same path as typing `@[label](dsh-session:…)` yourself; no extra transmission path is added;
- Snapshot content is sent to **the model provider you have configured** (the same way DSH sends its own requests).

## Settings

- Settings are stored **locally** in `settings.yaml` (`<DSH_HOME>/settings.yaml`, namespace `session-kb`), read/written by the host loopback route: 会话库 preferences (enable switch / default search scope) and 会话视图 preferences (which views are hidden + their order).

## No network / no collection

- The plugin's HTTP endpoints (`/session-kb/*`) listen only on the **127.0.0.1 loopback** with `isLoopback` checks — local access only;
- **Zero network requests, no telemetry, no analytics, no crash reporting, no third-party data collection** (verifiable in DevTools → Network);
- No search results or session information is ever sent to the plugin author or any other service.

## Data ownership & deletion

- All data stays on your machine and belongs to you;
- Disabling or uninstalling this plugin does not delete your session logs or the settings in `settings.yaml`;
- The search index is managed by the official DSH engine; this plugin creates no standalone persistent data files.

## Permission boundary

- The plugin requests and needs **no network permission** (other than DSH's own requests to your model provider);
- It does not read credentials from environment variables or data from other applications.

For any privacy questions, please open an issue in the repository.
