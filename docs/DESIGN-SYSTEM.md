# dsh-session-workbench — Design System (DESIGN-SYSTEM)

> Version: 1.0.0 ｜ Updated: 2026-08-30 ｜ Status: in sync with the implementation
> Every value below is taken from **measured CSS** in better-sidebar 0.13.0, the workspace client, and dsh-personal-center — follow it when changing UI to stay consistent with native DSH.

## 0. Rules

1. **Use only `--dsw-alias-*` theme tokens** (auto light/dark via `body[data-ds-dark-theme]`); `--dsw-static-*` only for brand accents;
2. Icon strokes use **`currentColor`** (inherit text color, adapt to light/dark automatically);
3. Interactions (hover/selected/expanded) should **mirror better-sidebar / workspace native components** — don't invent a new style.

## 1. Icons

| Item | Spec |
|---|---|
| Style | Outline strokes (like `Icon*Outline16`); when drawing your own at `viewBox 0 0 40 40`, use **`strokeWidth: 3.5`** (≈ native 1.5px on a 16 viewBox when scaled to 16px) |
| Color | `currentColor` |
| A11y | `aria-hidden="true"` |
| Session KB icon | Ring + cross (user-provided SVG), shared in three spots: the right-sidebar tab icon (registerTab `icon`), the tab panel header, and the settings section title (v1.0 removed the settings title icon per user request — now only the two tab spots) |
| Utility icons | Search = magnifier (circle+line), More = three dots (custom `SearchIcon`/`MoreIcon`, strokeWidth 1.5 on a 16 viewBox) |

## 2. Typography (official tokens)

| Use | Token |
|---|---|
| Result title / row primary text | `--dsw-font-s-14` (14px) |
| Panel body / snippet | `--dsw-font-xs-13` / `--dsw-font-xxs-12` |
| Meta / secondary info | `--dsw-font-xxs-12` |
| Labels / badges / buttons | `--dsw-font-xxxs-strong-11` / `--dsw-font-xxs-strong-12` |
| Section title (settings) | 18px/600 (same as personal-center `dsh-pc-heading`) |

## 3. Spacing & sizes

| Component | Value |
|---|---|
| Header row (sectionHeader style) | 36px tall; `padding: 0 8px 0 12px`; title left, icons right |
| Icon button (iconButton style) | 28×28 circle; hover = `interactive-bg-hover`; focus-visible = `interactive-bg-hover-accent` 2px |
| Search input | collapsed 28px circle icon → expanded 30px tall, `border-radius:10px`, `border-l2` outline, inline fills the header row (18ms transition) |
| Result row | `border-radius:8px`, `margin:0 4px 2px`, `padding:6px 8px`; hover = `interactive-bg-hover`, selected = `interactive-bg-active` |
| Checkbox | 16×16, `border-radius:4px`; **hidden by default, appears on row hover, stays when selected** (brand blue + ✓) |
| Picked bar (bottom) | `border-top: border-l1`, `padding:8px 12px`, `bg-layer-1` |
| Insert-references button | full pill (999px), `max-width:200px`, **32px** tall, `padding:0 18px`, centered (`margin:24px auto 0`) |
| List container | `overflow-y:auto` + `overflow-x:hidden`; every flex child `min-width:0` (prevents a horizontal scrollbar) |

## 4. Button states (measured on the insert-references button)

| State | Visual |
|---|---|
| Disabled (nothing picked) | **light fill** `interactive-bg-hover` + muted text `label-tertiary` + **`opacity:1`**; hover/active **unchanged** (`disabled:hover` locked to the same color) |
| Enabled, default | brand-blue fill `button-primary-fill` + white foreground `label-primary-foreground` |
| Enabled hover / active | darker brand blue `button-primary-hover` |

> General button rules always use `:hover:not(:disabled)` — a disabled button never changes color on hover (mirrors personal-center's "Save custom instructions" button: disable via light fill + muted text, not opacity).

## 5. Interaction patterns (mirroring the left-sidebar workspace)

| Pattern | Notes |
|---|---|
| **Header row** | title (left) + search icon + more button (right); when search expands, the title fades and the more button hides (same as workspace `sectionHeader`/`headerActions`) |
| **Search** | click the icon → the input **expands in place** filling the header row, auto-focused; Esc / ✕ collapses (same as workspace `searchSlot`) |
| **More menu** | grouped menu (`type:"label"` group + `type:"separator"` + options + `selectedIds` ✓ brand-blue highlight), mirroring `ViewOptionsMenu`; includes "Clear filters" |
| **Result row** | single click expands the preview; click the path to expand the full path (default shows `…/last segment`); click the checkbox to pick (they don't interfere) |
| **Recent/Search switch** | no keyword = recent sessions (archived excluded by default); keyword = search results; **no tab bar**, state-driven |
| **Empty/Loading/Error** | all three states; **loading takes precedence over empty** (avoids misreading the first frame as "no sessions") |

## 6. Archived badge

| Item | Spec |
|---|---|
| Style | small pill: `border-l2` outline + `bg-layer-1` fill + `label-tertiary` text + `border-radius:999px`, `padding:0 6px`, `flex:none` |
| Position | right of the result-row title, left of the checkbox |
| Semantics | shown in the search view only (the recent view already excludes archived sessions by default) |

## 7. Dark mode

- All `--dsw-alias-*` tokens are redefined by the design system under `body[data-ds-dark-theme]` — **no manual dark overrides**;
- Icons use `currentColor` and adapt automatically;
- Hit-highlight `mark` uses `#ffe58f` (light emphasis, same as personal-center).

## 8. Motion

- Transition tokens: `--ds-transition-duration-slow` + `--ds-ease-in-out` (18ms search expand, 150ms hover, 200ms switch);
- `prefers-reduced-motion:reduce` disables animations;
- Self-drawn switch (personal-center DESIGN-SYSTEM §7.2): 36×20, track on = brand blue / off = gray, white 16px knob, `translateX(16px)`.

## 9. Conversation views (drag visuals, 1.0.0)

| Item | Spec |
|---|---|
| 视图行（设置分区/面板） | `bg-layer-3` 行、`border-radius:6px`、`padding:5px 6px`；可见行 `opacity:1`、隐藏行 `opacity:.55`（不可拖、`cursor:default`） |
| 拖拽把手 | `⋮⋮`，`label-tertiary`、`font-size:12px`、`letter-spacing:-1px`、`user-select:none` |
| 开关 | `skb-switch` + `skb-switch-knob`（同设置页开关：36×20，on=brand blue / off=gray，白 16px 旋钮 `translateX(16px)`） |
| 被拖行（幽灵） | `opacity:0.6` + `box-shadow:0 8px 22px rgba(0,0,0,.22)` + `z-index:3`，`transition:none`（即时跟手） |
| 落点行（目标） | `1px dashed var(--dsw-alias-brand-primary)` + `box-sizing:border-box`（零尺寸抖动）；拖回原位即清除 |
| 让位动画 | 非拖拽行 `transition:transform 120ms ease`，gap 变化才让位（减 DOM 抖动） |
| 面板容器 | `bg-layer-2`、`border-radius:10px`、`border-l2` 边框、阴影；`max-height≈190px` + `overflow-y:auto`（约 5 行后滚动） |
| 文本选中 | 标签/面板 `user-select:none`（防「复制/刷新」原生菜单遮挡） |

## 10. Related docs

- Implementation design: `docs/DESIGN.md`
- Platform notes: `../docs/PLATFORM-NOTES.md`
