/**
 * dsh-session-kb — 浏览器端。
 *
 * 侧边栏「会话库」Tab(better-sidebar registerTab)+ 设置「会话库」分区:
 *   - 搜索:全文搜索全部历史会话(FTS5,走宿主环回路由 /session-kb/search),
 *     支持工作区/日期过滤、滚动分页(cursor)、命中摘要高亮;
 *   - 预览:单击结果项展开命中上下文 + 会话元信息,「打开会话」「引用此会话」;
 *   - 召回:多选 ≤3 个会话,「插入引用」把选中会话以引用形式插入当前输入框
 *     (经会话 scoped ctx 发 slash/input-insert-reference 事件,平台渲染胶囊
 *     并在发送后注入只读快照);
 *   - 最近:最近会话最小列表(按创建时间倒序,滚动加载更多);
 *   - 设置:启用开关 + 搜索默认范围 + 隐私说明(读写走 /session-kb/settings)。
 *
 * 隐私边界:全部本地运行,零网络请求;只读会话元数据与命中摘要。
 */
window.__ModuleLoader__.load({
	id: "dsh-session-kb",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		const React = react;

		//#region 文案(zh/en 双语,与个人中心一致)
		const NS = "session-kb";
		const zh = {
			"nav": "会话库",
			"tagline": "搜索全部历史会话，一键以引用召回给 AI",
			"search.placeholder": "搜索所有历史会话…（如：MCP 配置）",
			"search.label": "搜索",
			"search.lead": "输入关键词搜索全部历史会话",
			"search.empty": "没有找到匹配的会话",
			"search.emptyHint": "试试其他关键词，或清除过滤条件",
			"search.noSession": "还没有任何会话，先去新建会话开始对话吧",
			"search.error": "搜索失败",
			"search.disabled": "全文检索未启用，请在 profile 配置中开启后重启",
			"search.retry": "重试",
			"search.clear": "清除过滤条件",
			"filter.allWorkspaces": "全部工作区",
			"filter.all": "全部",
			"filter.last7d": "近7天",
			"filter.last30d": "近30天",
			"filter.more": "更多过滤选项",
			"filter.workspace": "工作区",
			"filter.range": "时间范围",
			"filter.archived": "归档",
			"filter.archived.all": "全部（含归档）",
			"filter.archived.active": "仅未归档",
			"filter.archived.only": "仅归档",
			"tab.search": "搜索",
			"tab.recent": "最近",
			"tab.picked": "待引用",
			"pick.limit": "最多只能引用 3 个会话",
			"pick.title": "已选会话（最多 3 个，平台限制）",
			"pick.insert": "插入引用到输入框",
			"pick.noSession": "请先选择或新建一个会话",
			"pick.inserted": "已插入引用到输入框",
			"pick.disabled": "会话库已禁用，请在设置中开启",
			"action.open": "打开会话",
			"action.cite": "＋ 引用此会话",
			"action.cited": "已引用",
			"meta.untitled": "未命名",
			"meta.archived": "已归档",
			"meta.match": "匹配",
			"meta.duration": "时长",
			"meta.events": "事件",
			"meta.pathExpand": "点击展开完整路径",
			"preview.hint": "该会话较大，快照可能只保留部分内容",
			"recent.title": "最近会话",
			"recent.more": "加载更多",
			"recent.noMore": "没有更多了",
			"recent.loading": "加载中…",
			"settings.title": "会话库",
			"settings.desc": "全文搜索所有历史会话，一键把选中会话以引用形式召回给 AI（本地运行，无网络请求）",
			"settings.enabled": "启用会话库",
			"settings.enabledHint": "已开启，请在右侧栏「会话库」中查看与搜索历史会话",
			"settings.disabledHint": "开启后，可在右侧栏「会话库」中查看与搜索历史会话",
			"settings.scope": "搜索默认范围",
			"settings.scope.all": "全部工作区",
			"settings.scope.current": "当前工作区",
			"settings.privacyTitle": "隐私说明",
			"settings.privacy": "本插件纯本地运行：搜索使用本机 SQLite 全文索引，不发起任何网络请求；仅读取会话元数据与命中摘要用于检索展示，不读取/上传会话正文，不修改、不删除任何会话。"
		};
		const en = {
			"nav": "Session KB",
			"tagline": "Search all past sessions and recall them to the AI with one click",
			"search.placeholder": "Search all sessions… (e.g. MCP config)",
			"search.label": "Search",
			"search.lead": "Type a keyword to search all past sessions",
			"search.empty": "No matching sessions",
			"search.emptyHint": "Try another keyword, or clear the filters",
			"search.noSession": "No sessions yet — start a new conversation first",
			"search.error": "Search failed",
			"search.disabled": "Full-text search is disabled; enable it in the profile config and restart",
			"search.retry": "Retry",
			"search.clear": "Clear filters",
			"filter.allWorkspaces": "All workspaces",
			"filter.all": "All",
			"filter.last7d": "Last 7 days",
			"filter.last30d": "Last 30 days",
			"filter.more": "More filters",
			"filter.workspace": "Workspace",
			"filter.range": "Time range",
			"filter.archived": "Archived",
			"filter.archived.all": "All (incl. archived)",
			"filter.archived.active": "Active only",
			"filter.archived.only": "Archived only",
			"tab.search": "Search",
			"tab.recent": "Recent",
			"tab.picked": "Picked",
			"pick.limit": "You can reference at most 3 sessions",
			"pick.title": "Picked sessions (max 3, platform limit)",
			"pick.insert": "Insert references into input",
			"pick.noSession": "Pick or create a session first",
			"pick.inserted": "References inserted into input",
			"pick.disabled": "Session KB is disabled — enable it in Settings",
			"action.open": "Open session",
			"action.cite": "＋ Cite",
			"action.cited": "Cited",
			"meta.untitled": "Untitled",
			"meta.archived": "Archived",
			"meta.match": "match",
			"meta.duration": "duration",
			"meta.events": "events",
			"meta.pathExpand": "Click to expand full path",
			"preview.hint": "This session is large; the snapshot may only keep part of it",
			"recent.title": "Recent sessions",
			"recent.more": "Load more",
			"recent.noMore": "No more",
			"recent.loading": "Loading…",
			"settings.title": "Session KB",
			"settings.desc": "Search all past sessions and recall them to the AI as references (local only, no network)",
			"settings.enabled": "Enable Session KB",
			"settings.enabledHint": "Enabled — open the Session KB tab in the right sidebar to search",
			"settings.disabledHint": "Enable to open the Session KB tab in the right sidebar",
			"settings.scope": "Default search scope",
			"settings.scope.all": "All workspaces",
			"settings.scope.current": "Current workspace",
			"settings.privacyTitle": "Privacy",
			"settings.privacy": "Runs fully locally: search uses the on-device SQLite full-text index with no network requests; only session metadata and hit snippets are read for display — never the session body — and no session is modified or deleted."
		};
		//#endregion

		//#region 工具
		const MAX_PICKS = 3;
		const SEARCH_PAGE = 20;
		const RECENT_PAGE = 20;

		/** 防注入转义。 */
		function esc(text) {
			return String(text).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
		}

		/** 高亮关键词(字面短语,大小写不敏感)。 */
		function highlight(text, query) {
			if (!query) return esc(text);
			const q = query.trim();
			if (!q) return esc(text);
			const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			let parts;
			try {
				parts = String(text).split(new RegExp(`(${escaped})`, "giu"));
			} catch {
				parts = [String(text)];
			}
			return parts.map((part, i) => (i % 2 === 1 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
		}

		/**
		 * 浏览器端 base64url(无 Buffer)。官方 mention URI =
		 * `dsh-session:<base64url(JSON.stringify(sessionId))>`。
		 */
		function b64url(text) {
			const bytes = new TextEncoder().encode(text);
			let bin = "";
			for (const b of bytes) bin += String.fromCharCode(b);
			return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
		}

		/** 按官方格式构造会话引用 mention(与 formatSessionReferenceMention 一致)。 */
		function makeMention(sessionId, label) {
			const escaped = String(label ?? sessionId).replace(/[\\\]]/g, (m) => "\\" + m);
			const uri = "dsh-session:" + b64url(JSON.stringify(sessionId));
			return `@[${escaped}](${uri})`;
		}

		function formatTime(ts) {
			if (!ts) return "";
			const d = new Date(ts);
			const pad = (n) => (n < 10 ? "0" + n : String(n));
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}

		function formatDuration(ms) {
			if (ms === null || ms === undefined) return "";
			const s = Math.max(1, Math.round(ms / 1000));
			if (s < 60) return `${s}s`;
			const m = Math.floor(s / 60);
			if (m < 60) return `${m}m`;
			const h = Math.floor(m / 60);
			return `${h}h${m % 60}m`;
		}

		/** n 天前的毫秒时间戳。 */
		function daysAgo(n) {
			return Date.now() - n * 86400000;
		}

		/** 路径缩写:只保留最后一段,前面用 … 代替(点击才展开完整路径)。 */
		function shortPath(cwd) {
			if (!cwd) return "";
			const parts = String(cwd).split("/").filter(Boolean);
			if (parts.length <= 1) return parts[0] ?? cwd;
			return `…/${parts[parts.length - 1]}`;
		}

		/** 环回路由 GET。 */
		async function kbGet(path) {
			const res = await fetch(path);
			if (!res.ok) {
				let detail = "";
				let disabled = false;
				try {
					const data = await res.json();
					detail = data?.error ? `: ${data.error}` : "";
					disabled = data?.disabled === true;
				} catch {
					/* ignore */
				}
				const error = new Error(`HTTP ${res.status}${detail}`);
				error.status = res.status;
				error.disabled = disabled;
				throw error;
			}
			return res.json();
		}

		/** 环回路由 POST(JSON)。 */
		async function kbPost(path, body) {
			const res = await fetch(path, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			return res.json();
		}

		/**
		 * 会话库图标(线性描边风格,与 DSH 原生 Icon*Outline16 一致)。
		 * 描边用 currentColor,继承文字色,深浅色自动适配(设计规范铁律②)。
		 * strokeWidth 3.5 对齐 dsh-personal-center patch 实测值(40 viewBox 下
		 * 缩放到 16px 仍清晰,与原生 1.5px/16 viewBox 视觉等价)。
		 * @param {{size?: number}} props
		 */
		function SessionKbIcon({ size = 16 }) {
			return React.createElement(
				"svg",
				{
					width: size,
					height: size,
					viewBox: "0 0 40 40",
					fill: "none",
					xmlns: "http://www.w3.org/2000/svg",
					"aria-hidden": true
				},
				React.createElement("path", {
					d: "M34 27.752C35.2743 25.4555 36 22.8125 36 20C36 11.1634 28.8366 4 20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36C22.9605 36 25.7331 35.196 28.1115 33.7944C30.308 32.5 32.5 33.5 34 35",
					stroke: "currentColor",
					strokeWidth: 3.5,
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}),
				React.createElement("path", { d: "M13 20.5H27", stroke: "currentColor", strokeWidth: 3.5 }),
				React.createElement("path", { d: "M20.0049 13.505L20.0049 27.505", stroke: "currentColor", strokeWidth: 3.5 })
			);
		}

		/** 搜索图标(放大镜,线性描边)。 */
		function SearchIcon({ size = 14 }) {
			return React.createElement(
				"svg",
				{ width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true },
				React.createElement("circle", { cx: "7", cy: "7", r: "4.5", stroke: "currentColor", strokeWidth: "1.5" }),
				React.createElement("path", { d: "m10.5 10.5 3.5 3.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
			);
		}

		/** 更多图标(三点纵向,线性描边)。 */
		function MoreIcon({ size = 14 }) {
			return React.createElement(
				"svg",
				{ width: size, height: size, viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true },
				React.createElement("circle", { cx: "8", cy: "3.5", r: "1.2", fill: "currentColor" }),
				React.createElement("circle", { cx: "8", cy: "8", r: "1.2", fill: "currentColor" }),
				React.createElement("circle", { cx: "8", cy: "12.5", r: "1.2", fill: "currentColor" })
			);
		}
		//#endregion

		//#region 插入引用(会话 scoped ctx → slash 事件)
		/**
		 * 把引用插入目标会话的输入框。
		 * reference 结构对齐官方 @ 菜单:source="reference"、ref=规范 mention、
		 * label 用于胶囊显示;span 追加到草稿末尾(每次插入后重读 draft/draftRev)。
		 * @returns {boolean} 是否至少插入成功一个
		 */
		function insertReferences(ctx, sessionId, picks) {
			try {
				const actx = ctx.sessions.scope(sessionId);
				if (actx === undefined) return false;
				const conversation = ctx.get("conversation");
				if (conversation === undefined) return false;
				const input = conversation.input.for(actx);
				let applied = 0;
				for (const pick of picks) {
					const snapshot = input.state.getSnapshot();
					const draft = snapshot.draft ?? "";
					const draftRev = snapshot.draftRev ?? 0;
					const span = { start: draft.length, end: draft.length, draftRev };
					const reference = {
						source: "reference",
						ref: pick.mention,
						label: pick.label || pick.sessionId,
						appearance: "session",
						clipboardText: pick.mention
					};
					const ok = actx.bail(actx, "slash/input-insert-reference", { reference, span }) === true;
					if (ok) applied += 1;
				}
				return applied > 0;
			} catch (error) {
				console.warn("[session-kb] insert reference failed:", error);
				return false;
			}
		}
		//#endregion

		//#region CSS(对齐 better-sidebar / workspace 原生设计规范,值取自 sidebar.module.css 与 workspace client 实测)
		const css = "" +
			/* 容器:透明继承 pane 背景,与原生 Tab 一致;作为菜单定位锚点 */
			".skb{display:flex;flex-direction:column;height:100%;min-height:0;min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);background:transparent;position:relative;overflow-x:hidden}" +
			/* 标题行:对齐 workspace sectionHeader(36px,标题左,图标右) */
			".skb-header{box-sizing:border-box;height:36px;color:var(--dsw-alias-label-tertiary);border-radius:12px;flex:none;justify-content:flex-end;align-items:center;gap:4px;margin:2px 4px 4px;padding-left:8px;display:flex;overflow:hidden}" +
			".skb-header-label{white-space:nowrap;opacity:1;visibility:visible;min-width:0;max-width:45%;transition:max-width .18s var(--ds-ease-in-out),margin-right .18s var(--ds-ease-in-out),opacity .12s var(--ds-ease-in-out),transform .18s var(--ds-ease-in-out),visibility 0s linear;flex:none;line-height:20px;font-size:13px;overflow:hidden;margin-right:auto}" +
			".skb-header-label.hidden{opacity:0;visibility:hidden;max-width:0;margin-right:0;transition-delay:0s,0s,0s,0s,.18s;transform:translate(-4px)}" +
			/* 搜索槽:图标内联展开成输入框(对齐 workspace searchSlot/search) */
			".skb-search-slot{box-sizing:border-box;min-width:0;max-width:28px;transition:max-width .18s var(--ds-ease-in-out),padding-left .18s var(--ds-ease-in-out);flex:1;align-items:center;margin-left:auto;padding-left:0;display:flex}" +
			".skb-search-slot.expanded{max-width:100%;padding-left:0}" +
			".skb-search{box-sizing:border-box;cursor:text;width:100%;height:28px;color:var(--dsw-alias-label-secondary);transition:width .18s var(--ds-ease-in-out),padding .18s var(--ds-ease-in-out),border-color .18s var(--ds-ease-in-out),background-color .18s var(--ds-ease-in-out);background:0 0;border:none;border-radius:50%;flex:none;align-items:center;gap:0;margin:0;padding:0;display:flex;overflow:hidden}" +
			".skb-search.expanded{border:1px solid var(--dsw-alias-border-l2);width:100%;height:30px;color:var(--dsw-alias-label-caption);background:0 0;border-radius:10px;margin-inline:-2px;padding:0 4px 0 0}" +
			".skb-search-btn{cursor:pointer;width:28px;height:28px;color:inherit;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}" +
			".skb-search.expanded .skb-search-btn{width:28px;height:30px}" +
			".skb-search-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			".skb-search.expanded .skb-search-btn:hover{background:0 0}" +
			".skb-search-input{opacity:0;pointer-events:none;width:0;min-width:0;color:var(--dsw-alias-label-primary);transition:opacity .12s var(--ds-ease-in-out);background:0 0;border:none;outline:none;appearance:none;-webkit-appearance:none;box-shadow:none;flex:1;font-size:13px;line-height:18px}" +
			/* 聚焦彻底去内框:提高特异性(.skb .skb-search-input:focus)压过末尾通用
			   .skb :focus-visible,并清掉浏览器默认 appearance/box-shadow */
			".skb .skb-search-input:focus,.skb .skb-search-input:focus-visible,.skb-search-input:focus,.skb-search-input:focus-visible{outline:none;box-shadow:none;border:none;background:transparent;appearance:none;-webkit-appearance:none}" +
			".skb-search.expanded .skb-search-input{opacity:1;pointer-events:auto;margin-left:-2px}" +
			".skb-search-input::placeholder{color:var(--dsw-alias-label-tertiary)}" +
			".skb-search-clear{cursor:pointer;width:24px;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}" +
			".skb-search-clear:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			/* 更多按钮(搜索展开时隐藏,对齐 headerActions) */
			".skb-header-actions{opacity:1;visibility:visible;max-width:60px;transition:max-width .18s var(--ds-ease-in-out),opacity .12s var(--ds-ease-in-out),transform .18s var(--ds-ease-in-out),visibility 0s linear;flex:none;align-items:center;gap:4px;display:flex;overflow:hidden}" +
			".skb-header-actions.hidden{opacity:0;visibility:hidden;pointer-events:none;max-width:0;transition-delay:0s,0s,0s,.18s;transform:translate(4px)}" +
			".skb-iconbtn{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex;transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out),color var(--ds-transition-duration-slow) var(--ds-ease-in-out)}" +
			".skb-iconbtn:hover:not(:disabled),.skb-iconbtn.active{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}" +
			".skb-iconbtn:disabled{opacity:.4;cursor:default}" +
			".skb-iconbtn:focus-visible{outline:2px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}" +
			/* 更多分组菜单:挂到 .skb 下绝对定位(避免被 header-actions overflow:hidden 裁剪) */
			".skb-menu{position:absolute;top:38px;right:8px;z-index:60;min-width:200px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);border-radius:10px;box-shadow:var(--dsw-shadow-lv3);padding:6px;flex-direction:column;display:flex}" +
			".skb-menu-label{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);padding:6px 10px 3px;text-transform:uppercase;letter-spacing:.02em}" +
			".skb-menu-sep{height:1px;background:var(--dsw-alias-border-l1);margin:5px 6px}" +
			".skb-menu-item{appearance:none;box-sizing:border-box;width:100%;font:inherit;text-align:left;cursor:pointer;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:6px;align-items:center;gap:8px;padding:6px 10px;font-size:13px;line-height:20px;display:flex}" +
			".skb-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}" +
			".skb-menu-item.selected{color:var(--dsw-alias-label-primary)}" +
			".skb-menu-check{width:14px;flex:none;color:var(--dsw-alias-brand-primary);font-size:12px}" +
			".skb-menu-clear{appearance:none;width:100%;font:inherit;text-align:left;cursor:pointer;color:var(--dsw-alias-brand-primary);background:0 0;border:none;border-radius:6px;padding:6px 10px;font-size:13px;line-height:20px}" +
			".skb-menu-clear:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			/* 列表:行式,与 explorerBody/gitRow 一致;仅垂直滚动,禁止水平条 */
			".skb-list{flex:1;overflow-y:auto;overflow-x:hidden;padding:6px 6px 8px;min-height:0;min-width:0}" +
			".skb-item{border-radius:8px;margin:0 4px 2px;cursor:pointer;padding:6px 8px;transition:background var(--ds-transition-duration-slow) var(--ds-ease-in-out);min-width:0}" +
			".skb-item:hover{background:var(--dsw-alias-interactive-bg-hover)}" +
			".skb-item[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}" +
			".skb-item-top{display:flex;align-items:center;gap:8px;min-height:24px;min-width:0}" +
			".skb-item-title{font:var(--dsw-font-s-14);color:var(--dsw-alias-label-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}" +
			/* 归档徽标:小号胶囊,弱化但不刺眼 */
			".skb-archived-badge{flex:none;font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:0 6px;line-height:16px;background:var(--dsw-alias-bg-layer-1)}" +
			/* 勾选框:默认隐藏,鼠标悬停该行时出现,选中后常显(与原生 explorer 行操作交互一致) */
			".skb-check{width:16px;height:16px;border:1.5px solid var(--dsw-alias-border-l2);border-radius:4px;display:none;align-items:center;justify-content:center;font-size:11px;color:var(--dsw-alias-label-primary-inverted);flex-shrink:0;background:transparent}" +
			".skb-item:hover .skb-check,.skb-item[data-selected=true] .skb-check{display:flex}" +
			".skb-item[data-selected=true] .skb-check{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}" +
			".skb-item-meta{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap;min-width:0}" +
			/* 路径:超长省略号,不撑破容器(去掉固定 max-width,改用 flex 内收缩) */
			".skb-path{cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:color .15s;min-width:0}" +
			".skb-path:hover{color:var(--dsw-alias-label-secondary)}" +
			".skb-item-sum{font:var(--dsw-font-xxs-12);margin-top:4px;color:var(--dsw-alias-label-secondary);line-height:1.5;word-break:break-word;min-width:0}" +
			".skb-item-sum mark{background:#ffe58f;color:inherit;border-radius:2px;padding:0 1px}" +
			".skb-actions{display:none;gap:6px;margin-top:8px;flex-wrap:wrap;min-width:0}" +
			".skb-item[data-expanded=true] .skb-actions{display:flex}" +
			/* 按钮:次级 = 描边透明,主 = primary-fill(同 gitCommitButton)。
			   hover 仅作用于启用态(:not(:disabled)),禁用按钮永不因悬停变色 */
			".skb-btn{font:var(--dsw-font-xxs-12);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:6px;padding:4px 12px;cursor:pointer;font-family:inherit}" +
			".skb-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}" +
			".skb-btn.primary{color:var(--dsw-alias-label-primary-inverted);background:var(--dsw-alias-button-primary-fill);border-color:transparent}" +
			".skb-btn.primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}" +
			".skb-btn:disabled{opacity:.45;cursor:default}" +
			".skb-btn.cite{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);background:transparent}" +
			".skb-btn.cite:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}" +
			".skb-btn.cite:disabled{opacity:.35}" +
			/* 预览详情 */
			".skb-detail{margin-top:8px;border-top:1px dashed var(--dsw-alias-border-l1);padding-top:8px;font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);line-height:1.7;min-width:0;overflow-wrap:break-word}" +
			".skb-detail b{color:var(--dsw-alias-label-primary);font-weight:600}" +
			".skb-hint{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-label-tertiary);margin-top:6px}" +
			/* 待引用条:底部条,与原生 border-top 分隔一致 */
			".skb-picked{border-top:1px solid var(--dsw-alias-border-l1);padding:8px 12px;background:var(--dsw-alias-bg-layer-1);flex-shrink:0;min-width:0;overflow-x:hidden}" +
			".skb-picked-title{font:var(--dsw-font-xxxs-strong-11);color:var(--dsw-alias-label-tertiary);margin-bottom:6px}" +
			".skb-picked-list{display:flex;flex-wrap:wrap;gap:6px;min-width:0}" +
			".skb-chip{display:inline-flex;align-items:center;gap:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;padding:2px 8px;font:var(--dsw-font-xxs-12);max-width:180px;min-width:0}" +
			".skb-chip .txt{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}" +
			".skb-chip .x{cursor:pointer;opacity:.6;background:none;border:none;color:inherit;padding:0;font-size:11px}" +
			".skb-chip .x:hover{opacity:1}" +
			/* 插入引用按钮:参考个人中心「自定义指令保存按钮」配色 —— 禁用态浅底鲜亮(opacity:1),
			   启用态品牌蓝填充;覆盖 .skb-btn 的通用灰重禁用样式 */
			".skb-insert{display:flex;max-width:200px;margin:24px auto 0;height:32px;font:var(--dsw-font-xxs-strong-12);border-radius:999px;padding:0 18px;align-items:center;justify-content:center;border:none}" +
			/* 禁用态只有「默认」一个视觉:浅底弱文字,悬停/点击均不变色 */
			".skb-insert:disabled,.skb-insert:disabled:hover,.skb-insert:disabled:active{opacity:1;cursor:default;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary)}" +
			/* 启用态:默认品牌蓝 → hover 加深 → 点击同深(两态 + 点击反馈;
			   button-primary-active 令牌不存在,点击复用 hover 深色) */
			".skb-insert:not(:disabled){background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}" +
			".skb-insert:not(:disabled):hover,.skb-insert:not(:disabled):active{background:var(--dsw-alias-button-primary-hover)}" +
			".skb-limit{font:var(--dsw-font-xxxs-11);color:var(--dsw-alias-state-warn-primary);margin-top:4px}" +
			/* 空态/加载/错误:与原生空态一致 */
			".skb-state{font:var(--dsw-font-xxs-12);text-align:center;color:var(--dsw-alias-label-tertiary);padding:24px 12px;line-height:1.8}" +
			".skb-state .btn{margin-top:8px}" +
			".skb-loadmore{font:var(--dsw-font-xxs-12);text-align:center;padding:6px;color:var(--dsw-alias-label-tertiary);border:none;background:transparent;cursor:pointer;width:100%;font-family:inherit}" +
			".skb-loadmore:hover{color:var(--dsw-alias-label-primary)}" +
			/* 设置分区:卡片列表(对齐「模型」分区 rowCard 实测:12px 圆角 / border-l2 / 12px gap) */
			".skb-settings-list{flex-direction:column;gap:8px;margin-top:12px;display:flex}" +
			".skb-settings-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;flex-direction:column;display:flex;transition:border-color .16s,background .16s}" +
			".skb-settings-card:hover{border-color:var(--dsw-alias-label-dimmed)}" +
			".skb-settings-card.open{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}" +
			".skb-settings-head{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 14px 14px 16px;display:flex;box-sizing:border-box}" +
			".skb-settings-head:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}" +
			".skb-settings-head-text{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}" +
			".skb-settings-name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}" +
			".skb-settings-desc{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}" +
			".skb-settings-chevron{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px;transition:transform .16s}" +
			".skb-settings-chevron.open{transform:rotate(90deg)}" +
			/* 开关固定在右侧,与名称左右对称;padding 与左 16px 对称(避免超出描边) */
			".skb-settings-toggle{flex:none;cursor:pointer;display:inline-flex;padding-right:2px}" +
			".skb-settings-body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:14px 0 12px;flex-direction:column;gap:14px;display:flex}" +
			/* 搜索范围:标签左、下拉右(左右平衡,避免展开区右侧空白) */
			".skb-settings-field{flex-direction:row;align-items:center;justify-content:space-between;gap:12px;display:flex}" +
			".skb-settings-field-label{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;flex:none}" +
			".skb-settings-select{box-sizing:border-box;height:32px;min-width:200px;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 10px;font-size:13px;outline:none}" +
			".skb-settings-select:focus{border-color:var(--dsw-alias-brand-primary)}" +
			".skb-settings-privacy{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:8px;padding:10px 12px}" +
			".skb-settings-privacy-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;margin:0 0 6px;line-height:20px}" +
			".skb-settings-privacy-text{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.8;margin:0}" +
			/* 启用开关(自绘,同个人中心 DESIGN-SYSTEM §7.2:36×20 / 轨道灰=interactive-bg-hover / 开=品牌蓝 / 圆钮=前景白) */
			".skb-switch{box-sizing:border-box;width:36px;height:20px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover);position:relative;display:inline-block;transition:background .2s ease;flex:none}" +
			".skb-switch.on{background:var(--dsw-alias-brand-primary)}" +
			".skb-switch-knob{box-sizing:border-box;position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-foreground);box-shadow:0 1px 2px rgba(0,0,0,.28);transition:transform .2s ease}" +
			".skb-switch.on .skb-switch-knob{transform:translateX(16px)}" +
			/* 焦点可见性与动效,对齐原生规范 */
			".skb :focus-visible{outline:2px solid var(--dsw-alias-interactive-bg-hover-accent);outline-offset:-1px}" +
			"@media (prefers-reduced-motion:reduce){.skb-item{transition:none}}";
		//#endregion

		//#region 会话库 Tab 组件
		/**
		 * 会话库主面板(挂在 better-sidebar Tab)。
		 * @param {import('./client').TabComponentProps} props
		 */
		function SessionKbTab({ ctx, scope }) {
			const t = react.useMemo(() => ctx.locale.bind(NS), [ctx]);
			const sessionId = scope?.sessionId;
			const [query, setQuery] = react.useState("");
			const [wsFilter, setWsFilter] = react.useState("");
			const [rangeFilter, setRangeFilter] = react.useState("all");
			// 归档筛选:all=包含归档(搜索默认) / active=仅未归档 / archived=仅归档
			const [archivedFilter, setArchivedFilter] = react.useState("all");
			const [searchOpen, setSearchOpen] = react.useState(false);
			const [moreOpen, setMoreOpen] = react.useState(false);
			const searchInputRef = react.useRef(null);
			const [items, setItems] = react.useState([]);
			const [recent, setRecent] = react.useState([]);
			const [recentOffset, setRecentOffset] = react.useState(0);
			const [recentTotal, setRecentTotal] = react.useState(0);
			const [picks, setPicks] = react.useState([]);
			const [expandedId, setExpandedId] = react.useState(null);
			const [pathExpandedId, setPathExpandedId] = react.useState(null);
			const [loading, setLoading] = react.useState(false);
			const [error, setError] = react.useState(null);
			const [nextCursor, setNextCursor] = react.useState(undefined);
			const [recentMore, setRecentMore] = react.useState(false);
			const [recentLoading, setRecentLoading] = react.useState(false);
			const [settings, setSettings] = react.useState(null);
			const [workspaces, setWorkspaces] = react.useState([]);
			const searchSeq = react.useRef(0);

			// 读取设置 + 工作区列表(来自当前会话列表快照的 cwd 去重)。
			react.useEffect(() => {
				let alive = true;
				kbGet("/session-kb/settings")
					.then((d) => {
						if (alive && d?.ok !== false) setSettings({ enabled: d.enabled !== false, scope: d.scope === "current" ? "current" : "all" });
					})
					.catch(() => {});
				const sessions = ctx.get("sessions");
				if (sessions?.list) {
					const snapshot = sessions.list.getSnapshot();
					const wsSet = new Set();
					for (const key of Object.keys(snapshot?.byId ?? {})) {
						const record = snapshot.byId[key];
						if (record?.cwd) wsSet.add(record.cwd);
					}
					setWorkspaces([...wsSet].sort());
				}
				return () => {
					alive = false;
				};
			}, [ctx]);

			// 搜索(防抖 300ms;结果仅展示命中项)。
			const runSearch = react.useCallback((q, ws, range, cursor, append, archived) => {
				const seq = ++searchSeq.current;
				setLoading(true);
				setError(null);
				const from = range === "7d" ? daysAgo(7) : range === "30d" ? daysAgo(30) : undefined;
				const params = new URLSearchParams({ q });
				if (ws) params.set("ws", ws);
				if (from !== undefined) params.set("from", String(from));
				params.set("limit", String(SEARCH_PAGE));
				params.set("archived", archived ?? archivedFilter);
				if (cursor) params.set("cursor", cursor);
				kbGet(`/session-kb/search?${params.toString()}`)
					.then((d) => {
						if (searchSeq.current !== seq) return;
						setItems((prev) => (append ? [...prev, ...(d.items ?? [])] : d.items ?? []));
						setNextCursor(d.nextCursor);
						setLoading(false);
					})
					.catch((e) => {
						if (searchSeq.current !== seq) return;
						setError(e);
						setLoading(false);
					});
			}, [archivedFilter]);

			react.useEffect(() => {
				if (query.trim() === "") return;
				const handle = setTimeout(() => {
					runSearch(query.trim(), wsFilter, rangeFilter);
				}, 300);
				return () => clearTimeout(handle);
			}, [query, wsFilter, rangeFilter, archivedFilter, runSearch]);

			// 最近会话(分页;默认排除归档)。
			const loadRecent = react.useCallback(
				(offset) => {
					setRecentLoading(true);
					const params = new URLSearchParams({ limit: String(RECENT_PAGE) });
					if (wsFilter) params.set("ws", wsFilter);
					params.set("archived", "active");
					if (offset) params.set("offset", String(offset));
					kbGet(`/session-kb/sessions?${params.toString()}`)
						.then((d) => {
							setRecent((prev) => (offset ? [...prev, ...(d.items ?? [])] : d.items ?? []));
							setRecentTotal(d.total ?? 0);
							setRecentOffset(d.nextOffset);
							setRecentMore(d.nextOffset !== undefined);
							setRecentLoading(false);
						})
						.catch(() => {
							setRecentLoading(false);
						});
				},
				[wsFilter]
			);

			react.useEffect(() => {
				if (query.trim() !== "") return;
				loadRecent(0);
			}, [query, wsFilter, loadRecent]);

			// 打开会话
			const openSession = react.useCallback(
				(id) => {
					try {
						ctx.sessions.open(id);
					} catch (e) {
						console.warn("[session-kb] open session failed:", e);
					}
				},
				[ctx]
			);

			// 勾选/取消勾选(mention 按官方格式现场构造)。
			const togglePick = react.useCallback((item) => {
				setPicks((prev) => {
					const exists = prev.some((p) => p.sessionId === item.sessionId);
					if (exists) return prev.filter((p) => p.sessionId !== item.sessionId);
					if (prev.length >= MAX_PICKS) return prev;
					return [...prev, { sessionId: item.sessionId, label: item.title || item.sessionId, mention: makeMention(item.sessionId, item.title || item.sessionId) }];
				});
			}, []);

			// 插入引用
			const doInsert = react.useCallback(() => {
				if (picks.length === 0) return;
				if (!sessionId) {
					alert(t("pick.noSession"));
					return;
				}
				const ok = insertReferences(ctx, sessionId, picks);
				if (ok) setPicks([]);
				else alert(t("pick.noSession"));
			}, [ctx, sessionId, picks, t]);

			// 渲染单个结果项
			const renderItem = (item, isRecent) => {
				const selected = picks.some((p) => p.sessionId === item.sessionId);
				const expanded = expandedId === item.sessionId;
				const pathExpanded = pathExpandedId === item.sessionId;
				const summary = isRecent ? "" : item.bestMatch?.snippet ?? "";
				const titleText = item.title || t("meta.untitled");
				const bestTime = item.bestMatch?.time ?? item.createdAt;
				const durationMs = item.bestMatch?.time && item.createdAt ? item.bestMatch.time - item.createdAt : null;
				const cwd = item.cwd || "";
				return React.createElement(
					"div",
					{
						key: item.sessionId,
						className: "skb-item",
						"data-selected": selected,
						"data-expanded": expanded,
						onClick: (e) => {
							if (e.target.closest(".skb-check") || e.target.closest(".skb-actions") || e.target.closest(".skb-btn") || e.target.closest(".skb-path")) return;
							setExpandedId(expanded ? null : item.sessionId);
						}
					},
					React.createElement(
						"div",
						{ className: "skb-item-top" },
						React.createElement("span", { className: "skb-item-title", title: titleText }, highlight(titleText, isRecent ? "" : query)),
						item.archived ? React.createElement("span", { className: "skb-archived-badge" }, t("meta.archived")) : null,
						React.createElement("span", { className: "skb-check", onClick: () => togglePick(item) }, selected ? "✓" : "")
					),
					React.createElement(
						"div",
						{ className: "skb-item-meta" },
						cwd
							? React.createElement(
									"span",
									{
										className: "skb-path",
										title: pathExpanded ? cwd : t("meta.pathExpand"),
										onClick: () => setPathExpandedId(pathExpanded ? null : item.sessionId)
									},
									pathExpanded ? cwd : shortPath(cwd)
								)
							: React.createElement("span", null, "-"),
						React.createElement("span", null, formatTime(bestTime)),
						!isRecent && item.bestMatch ? React.createElement("span", null, `${t("meta.match")} ${item.bestMatch.type}`) : null
					),
					summary
						? React.createElement("div", { className: "skb-item-sum", dangerouslySetInnerHTML: { __html: highlight(summary, query) } })
						: null,
					React.createElement(
						"div",
						{ className: "skb-actions" },
						React.createElement("button", { className: "skb-btn", onClick: () => openSession(item.sessionId) }, t("action.open")),
						React.createElement(
							"button",
							{ className: "skb-btn cite", disabled: selected || picks.length >= MAX_PICKS, onClick: () => togglePick(item) },
							selected ? t("action.cited") : t("action.cite")
						),
						expanded && !isRecent && item.bestMatch
							? React.createElement(
									"div",
									{ className: "skb-detail" },
									React.createElement("div", null, React.createElement("b", null, item.cwd || "-"), ` · ${formatTime(item.createdAt)}`),
									durationMs !== null ? React.createElement("div", null, `${t("meta.duration")}: ${formatDuration(durationMs)}`) : null,
									item.bestMatch.snippet && item.bestMatch.snippet.length > 240 ? React.createElement("div", { className: "skb-hint" }, t("preview.hint")) : null
								)
							: null
					)
				);
			};

			// 列表主渲染(三态齐全;视图 = 有搜索词 → 搜索结果,否则最近会话)
			const renderList = () => {
				const isSearch = query.trim() !== "";
				if (error) {
					return React.createElement(
						"div",
						{ className: "skb-state" },
						React.createElement("div", null, error.disabled ? t("search.disabled") : `${t("search.error")}：${error.message || ""}`),
						React.createElement("button", { className: "skb-btn btn", onClick: () => runSearch(query.trim(), wsFilter, rangeFilter) }, t("search.retry"))
					);
				}
				/* 加载中优先于空态:搜索加载中 / 最近会话加载中(避免把加载初帧误判为"没有会话") */
				if (isSearch && loading && items.length === 0) {
					return React.createElement("div", { className: "skb-state" }, t("recent.loading"));
				}
				if (!isSearch && recentLoading && recent.length === 0) {
					return React.createElement("div", { className: "skb-state" }, t("recent.loading"));
				}
				const list = isSearch ? items : recent;
				if (list.length === 0) {
					/* 最近会话确认为空(非加载中) → 引导新建;搜索无结果 → 换词/清过滤 */
					const emptyTitle = isSearch ? t("search.empty") : recentTotal === 0 ? t("search.noSession") : t("search.empty");
					return React.createElement(
						"div",
						{ className: "skb-state" },
						React.createElement("div", null, emptyTitle),
						React.createElement("div", null, React.createElement("span", { style: { fontSize: "11px" } }, t("search.emptyHint"))),
						(isSearch && (query || wsFilter || rangeFilter !== "all" || archivedFilter !== "all"))
							? React.createElement(
									"button",
									{
										className: "skb-btn btn",
										onClick: () => {
											setQuery("");
											setWsFilter("");
											setRangeFilter("all");
											setArchivedFilter("all");
										}
									},
									t("search.clear")
								)
							: null
					);
				}
				const nodes = list.map((item) => renderItem(item, !isSearch));
				if (!isSearch) {
					if (recentLoading) nodes.push(React.createElement("div", { key: "__loading", className: "skb-loadmore" }, t("recent.loading")));
					else if (recentMore)
						nodes.push(React.createElement("button", { key: "__more", className: "skb-btn skb-loadmore", onClick: () => loadRecent(recentOffset) }, t("recent.more")));
					else if (recent.length > 0) nodes.push(React.createElement("div", { key: "__end", className: "skb-loadmore" }, t("recent.noMore")));
				} else if (nextCursor) {
					nodes.push(
						React.createElement("button", { key: "__more", className: "skb-btn skb-loadmore", onClick: () => runSearch(query.trim(), wsFilter, rangeFilter, nextCursor, true) }, t("recent.more"))
					);
				}
				return React.createElement("div", null, nodes);
			};

			// 禁用态
			if (settings !== null && settings.enabled === false) {
				return React.createElement("div", { className: "skb skb-state" }, t("pick.disabled"));
			}

			// 当前视图:有搜索词 → 搜索结果;无搜索词 → 最近会话。
			const isSearch = query.trim() !== "";
			/* 更多分组菜单(参考左侧栏 ViewOptionsMenu:label 组 + separator + selectedIds) */
			const filterItems = [
				{ type: "label", id: "filter-workspace-label", text: t("filter.workspace") },
				{ id: "ws:", label: t("filter.allWorkspaces") },
				...workspaces.map((ws) => ({ id: `ws:${ws}`, label: ws })),
				{ type: "separator", id: "filter-range-sep" },
				{ type: "label", id: "filter-range-label", text: t("filter.range") },
				{ id: "range:all", label: t("filter.all") },
				{ id: "range:7d", label: t("filter.last7d") },
				{ id: "range:30d", label: t("filter.last30d") },
				{ type: "separator", id: "filter-archived-sep" },
				{ type: "label", id: "filter-archived-label", text: t("filter.archived") },
				{ id: "archived:all", label: t("filter.archived.all") },
				{ id: "archived:active", label: t("filter.archived.active") },
				{ id: "archived:archived", label: t("filter.archived.only") }
			];
			const filterSelected = [wsFilter ? `ws:${wsFilter}` : "ws:", `range:${rangeFilter}`, `archived:${archivedFilter}`];
			const onFilterSelect = (id) => {
				if (id.startsWith("ws:")) setWsFilter(id === "ws:" ? "" : id.slice(3));
				else if (id.startsWith("range:")) setRangeFilter(id.slice(6));
				else if (id.startsWith("archived:")) setArchivedFilter(id.slice(9));
			};
			return React.createElement(
				"div",
				{ className: "skb" },
				/* 标题行(对齐左侧栏工作区 sectionHeader:标题左 + 搜索内联展开 + 更多按钮) */
				React.createElement(
					"div",
					{ className: "skb-header" },
					React.createElement(
						"span",
						{ className: `skb-header-label${searchOpen ? " hidden" : ""}` },
						isSearch ? t("tab.search") : t("recent.title")
					),
					/* 搜索槽:图标按钮点击后原位展开成输入框(同 searchSlot) */
					React.createElement(
						"div",
						{ className: `skb-search-slot${searchOpen ? " expanded" : ""}` },
						React.createElement(
							"div",
							{
								className: `skb-search${searchOpen ? " expanded" : ""}`,
								onClick: () => {
									setMoreOpen(false);
									setSearchOpen(true);
									searchInputRef.current?.focus();
								}
							},
							React.createElement(
								"button",
								{
									type: "button",
									className: "skb-search-btn",
									"aria-label": t("search.label"),
									"aria-expanded": searchOpen,
									onClick: (e) => {
										e.stopPropagation();
										setMoreOpen(false);
										setSearchOpen(true);
										searchInputRef.current?.focus();
									}
								},
								React.createElement(SearchIcon, { size: searchOpen ? 11 : 14 })
							),
							React.createElement("input", {
								ref: searchInputRef,
								type: "text",
								className: "skb-search-input",
								placeholder: t("search.placeholder"),
								value: query,
								tabIndex: searchOpen ? 0 : -1,
								onChange: (e) => setQuery(e.target.value),
								onKeyDown: (e) => {
									if (e.key !== "Escape") return;
									setQuery("");
									setSearchOpen(false);
								}
							}),
							searchOpen
								? React.createElement(
										"button",
										{
											type: "button",
											className: "skb-search-clear",
											"aria-label": t("search.clear"),
											onClick: (e) => {
												e.stopPropagation();
												setQuery("");
												setSearchOpen(false);
											}
										},
										"✕"
									)
								: null
						)
					),
					/* 更多按钮(搜索展开时隐藏,同 headerActions) */
					React.createElement(
						"div",
						{ className: `skb-header-actions${searchOpen ? " hidden" : ""}` },
						React.createElement(
							"button",
							{
								type: "button",
								className: `skb-iconbtn${moreOpen ? " active" : ""}`,
								"aria-label": t("filter.more"),
								"aria-expanded": moreOpen,
								onClick: () => {
									setSearchOpen(false);
									setMoreOpen((v) => !v);
								}
							},
							React.createElement(MoreIcon, { size: 14 })
						)
					)
				),
				/* 更多分组菜单(挂 .skb 下,避免被 header overflow:hidden 裁剪) */
				moreOpen
					? React.createElement(
							"div",
							{ className: "skb-menu", role: "menu" },
							filterItems.map((item) => {
								if (item.type === "label") {
									return React.createElement("div", { key: item.id, className: "skb-menu-label", role: "presentation" }, item.text);
								}
								if (item.type === "separator") {
									return React.createElement("div", { key: item.id, className: "skb-menu-sep", role: "separator" });
								}
								const selected = filterSelected.includes(item.id);
								return React.createElement(
									"button",
									{
										key: item.id,
										type: "button",
										className: `skb-menu-item${selected ? " selected" : ""}`,
										role: "menuitemradio",
										"aria-checked": selected,
										onClick: () => {
											onFilterSelect(item.id);
											setMoreOpen(false);
										}
									},
									React.createElement("span", { className: "skb-menu-check" }, selected ? "✓" : ""),
									item.label
								);
							}),
							(query || wsFilter || rangeFilter !== "all" || archivedFilter !== "all")
								? React.createElement(
										"button",
										{
											type: "button",
											className: "skb-menu-clear",
											onClick: () => {
												setQuery("");
												setWsFilter("");
												setRangeFilter("all");
												setArchivedFilter("all");
												setMoreOpen(false);
											}
										},
										t("search.clear")
									)
								: null
						)
					: null,
				React.createElement("div", { className: "skb-list" }, renderList()),
				/* 待引用条:常驻,空态时插入按钮禁用但可见 */
				React.createElement(
					"div",
					{ className: "skb-picked" },
					React.createElement("div", { className: "skb-picked-title" }, t("pick.title")),
					React.createElement(
						"div",
						{ className: "skb-picked-list" },
						picks.map((p) =>
							React.createElement(
								"span",
								{ key: p.sessionId, className: "skb-chip" },
								React.createElement("span", { className: "txt" }, `@${p.label}`),
								React.createElement("button", { className: "x", onClick: () => togglePick({ sessionId: p.sessionId }) }, "✕")
							)
						)
					),
					React.createElement("button", { className: "skb-btn primary skb-insert", disabled: picks.length === 0, onClick: doInsert }, t("pick.insert")),
					picks.length >= MAX_PICKS ? React.createElement("div", { className: "skb-limit" }, t("pick.limit")) : null
				)
			);
		}
		//#endregion

		//#region 设置分区组件(参考「模型」分区:卡片 + 右侧开关 + 点击展开)
		function SettingsSection({ t }) {
			const [settings, setSettings] = react.useState({ enabled: true, scope: "all" });
			const [open, setOpen] = react.useState(false);
			react.useEffect(() => {
				let alive = true;
				kbGet("/session-kb/settings")
					.then((d) => {
						if (alive && d?.ok !== false) setSettings({ enabled: d.enabled !== false, scope: d.scope === "current" ? "current" : "all" });
					})
					.catch(() => {});
				return () => {
					alive = false;
				};
			}, []);
			const save = (patch) => {
				const next = { ...settings, ...patch };
				setSettings(next);
				kbPost("/session-kb/settings", next).catch(() => {});
			};
			// 启用开关(自绘,与个人中心 DESIGN-SYSTEM §7.2 一致:36×20,品牌蓝开/灰关)。
			const toggleEl = React.createElement(
				"span",
				{ className: `skb-switch${settings.enabled ? " on" : ""}`, "aria-hidden": true },
				React.createElement("span", { className: "skb-switch-knob" })
			);
			return React.createElement(
				"div",
				{ className: "dsh-pc-section" },
				/* 标题不带图标:设置左侧功能列表已有「会话库」图标,下级页标题只留文字,避免重复 */
				React.createElement("h2", { className: "dsh-pc-heading" }, t("settings.title")),
				React.createElement("p", { className: "dsh-pc-intro" }, t("settings.desc")),
				React.createElement(
					"div",
					{ className: "skb-settings-list" },
					React.createElement(
						"div",
						{ className: `skb-settings-card${open ? " open" : ""}` },
						/* 卡片头部:名称在左 + 描述(有指向性) + 展开箭头 + 开关在右(点击整卡切换展开) */
						React.createElement(
							"div",
							{
								className: "skb-settings-head",
								role: "button",
								tabIndex: 0,
								"aria-expanded": open,
								onClick: () => setOpen((v) => !v),
								onKeyDown: (e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										setOpen((v) => !v);
									}
								}
							},
							React.createElement(
								"span",
								{ className: "skb-settings-head-text" },
								React.createElement("span", { className: "skb-settings-name" }, t("nav")),
								React.createElement(
									"span",
									{ className: "skb-settings-desc" },
									settings.enabled ? t("settings.enabledHint") : t("settings.disabledHint")
								)
							),
							React.createElement("span", { className: `skb-settings-chevron${open ? " open" : ""}` }, open ? "▾" : "▸"),
							React.createElement(
								"span",
								{
									className: "skb-settings-toggle",
									role: "switch",
									"aria-checked": settings.enabled,
									"aria-label": t("settings.enabled"),
									title: t("settings.enabled"),
									onClick: (e) => {
										e.stopPropagation();
										save({ enabled: !settings.enabled });
									}
								},
								toggleEl
							)
						),
						/* 展开区:搜索默认范围(标签左/下拉右) + 隐私说明 */
						open
							? React.createElement(
									"div",
									{ className: "skb-settings-body" },
									React.createElement(
										"div",
										{ className: "skb-settings-field" },
										React.createElement("span", { className: "skb-settings-field-label" }, t("settings.scope")),
										React.createElement(
											"select",
											{
												className: "skb-settings-select",
												value: settings.scope,
												"aria-label": t("settings.scope"),
												onChange: (e) => save({ scope: e.target.value })
											},
											React.createElement("option", { value: "all" }, t("settings.scope.all")),
											React.createElement("option", { value: "current" }, t("settings.scope.current"))
										)
									),
									React.createElement(
										"div",
										{ className: "skb-settings-privacy" },
										React.createElement("h3", { className: "skb-settings-privacy-title" }, t("settings.privacyTitle")),
										React.createElement("p", { className: "skb-settings-privacy-text" }, t("settings.privacy"))
									)
								)
							: null
					)
				)
			);
		}
		//#endregion

		//#region 客户端插件主体
		// betterSidebar 为可选服务(未安装时降级:仅保留设置分区入口),
		// 故不放入 inject 硬依赖;slots/locale 由客户端运行时提供。
		const inject = ["slots", "locale"];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "session-kb: dictionaries");
			const t = ctx.locale.bind(NS);

			// 注入样式(与插件生命周期同生共死)。
			ctx.effect(() => {
				const style = document.createElement("style");
				style.textContent = css;
				style.setAttribute("data-session-kb", "");
				document.head.appendChild(style);
				return () => {
					style.remove();
				};
			}, "session-kb: styles");

			// better-sidebar「会话库」Tab(T3 验证点:registerTab 停靠)。
			// 入口永远注册(不依赖设置读取),启用/禁用由 Tab 组件内部根据设置
			// 显示(PRD FR-SETTINGS-1:关闭后不挂载 UI,这里降级为入口常驻 +
			// 内部禁用提示,保证用户随时能找到入口,开关只控制功能可用性)。
			const betterSidebar = ctx.get("betterSidebar");
			if (betterSidebar !== undefined) {
				ctx.effect(
					() =>
						betterSidebar.registerTab({
							id: "session-kb",
							title: () => t("nav"),
							icon: (size) => React.createElement(SessionKbIcon, { size: size ?? 16 }),
							order: 50,
							single: true,
							component: (props) => React.createElement(SessionKbTab, props)
						}),
					"session-kb: register sidebar tab"
				);
				// better-sidebar 打开 tab 时把 title 快照进 store,之后不重解析
				// descriptor.title() —— locale 切换后已打开的 tab 标题不会跟随。
				// 这里订阅 locale,变化时用 updateTab 同步已打开 tab 的标题。
				ctx.effect(() => {
					const unsub = ctx.locale.subscribe(() => {
						betterSidebar.updateTab("session-kb", { title: t("nav") });
					});
					return unsub;
				}, "session-kb: sync tab title on locale change");
			}

			// 设置「会话库」分区。
			ctx.slots.inject("settings.section", () =>
				ctx.slots.register(
					{
						name: "settings.section",
						id: "session-kb",
						order: 30,
						label: () => t("nav"),
						inject: () => ({ t })
					},
					SettingsSection
				)
			);
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
