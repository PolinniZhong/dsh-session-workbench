/**
 * dsh-session-kb — 宿主端。
 *
 * 功能:
 *  1. 环回路由 /session-kb/*:全文搜索历史会话(searchSessions, FTS5 分页
 *     cursor)、片段前后文(readEvent 窗口),经 isLoopback 校验暴露给浏览器端。
 *     (最近会话由客户端本地化,无宿主端点。)
 *  2. 设置命名空间 session-kb:启用开关 + 搜索默认范围(环回路由读写,
 *     绕开 Web 设置白名单,直接走 ctx.settings)。
 *
 * 隐私边界:只读官方 FTS 索引(会话元数据 + 命中摘要),不修改/不删除会话,
 * 全部本地运行,零网络请求。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";

export const name = "dsh-session-kb";

/** 设置命名空间(与浏览器端约定一致)。 */
const NS = settingsNamespace("session-kb");

/** 命名空间 schema:启用开关 + 搜索默认范围(all=全部工作区 / current=当前工作区)。 */
const SettingsSchema = z.object({
	enabled: z.boolean().default(true),
	scope: z.string().default("all")
});

/** 环回校验(与插件控制台/个人中心一致)。 */
function isLoopback(address) {
	return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

/**
 * 读取已归档会话 id 集合(从 <DSH_HOME>/storages/workspace.json 的
 * global.archivedSessionIds;与个人中心同口径,只读)。
 * 解析失败返回空集(容错:不阻塞搜索)。
 */
function readArchivedSessionIds(documentPath) {
	try {
		const f = join(dirname(documentPath), "storages", "workspace.json");
		const doc = JSON.parse(readFileSync(f, "utf8"));
		const arr = doc?.global?.archivedSessionIds;
		return Array.isArray(arr) ? new Set(arr) : new Set();
	} catch {
		return new Set();
	}
}

/**
 * 归档过滤模式 → 保留判定。
 * @param {Set<string>} archived 已归档 id 集合
 * @param {string} mode all=全部 / active=仅未归档 / archived=仅归档
 * @returns {(id: string) => boolean} 保留该会话?
 */
function archivedFilter(archived, mode) {
	if (mode === "active") return (id) => !archived.has(id);
	if (mode === "archived") return (id) => archived.has(id);
	return () => true; // all / 未知值:全部
}

/**
 * 解析归档过滤模式(容错:非法值回落 all)。
 * @param {URL} url
 * @returns {'all'|'active'|'archived'}
 */
function parseArchivedMode(url) {
	const raw = url.searchParams.get("archived");
	return raw === "active" || raw === "archived" ? raw : "all";
}

/**
 * 解析设置文档路径(archivedSessionIds 存储位置的上级目录)。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @returns {string} settings 文档绝对路径;不可用时返回空串(归档集为空)。
 */
function fallbackDocumentPath(ctx) {
	const settings = ctx.get("settings");
	if (settings && typeof settings.documentPath === "string" && settings.documentPath) return settings.documentPath;
	return "";
}

/** 默认/最大分页大小(与 session-query 后端对齐,limit ∈ [1,100])。 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** 解析 limit 查询参数(容错:非法值回落默认)。 */
function parseLimit(raw) {
	const n = Number(raw);
	return Number.isSafeInteger(n) && n >= 1 && n <= MAX_LIMIT ? n : DEFAULT_LIMIT;
}

/** 解析数值查询参数(容错:非法返回 undefined)。 */
function parseNum(raw) {
	if (raw === null || raw === undefined || raw === "") return undefined;
	const n = Number(raw);
	return Number.isFinite(n) ? n : undefined;
}

function sendJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
	res.end(payload);
}

/** 读取 JSON 请求体(上限 64KB)。 */
async function readBody(req, maxBytes = 64 * 1024) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		total += chunk.length;
		if (total > maxBytes) throw new Error("请求体过大");
		chunks.push(chunk);
	}
	if (chunks.length === 0) return {};
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		throw new Error("请求体不是合法 JSON");
	}
}

// ── 搜索缓存(性能优化)────────────────────────────────────────────────────
// 官方 sessionQuery 每次搜索都会全量 reconcile 观察(78MB 会话日志量级 → 1.7s+,
// 且阻塞宿主进程)。相同参数的搜索在短窗口内结果不变,加 TTL 缓存避免重复全量观察。
// v1-PRD §9.1「宿主路由聚合加缓存」落地;TTL 30s 平衡新鲜度与性能。
const SEARCH_CACHE_TTL_MS = 30_000;
const searchCache = new Map(); // key -> { at, body }

function searchCacheKey(q, ws, from, to, archived, limit, cursor) {
	return JSON.stringify({ q, ws, from: from ?? null, to: to ?? null, archived, limit, cursor: cursor ?? null });
}

function searchCacheGet(key) {
	const entry = searchCache.get(key);
	if (entry === undefined) return undefined;
	if (Date.now() - entry.at > SEARCH_CACHE_TTL_MS) {
		searchCache.delete(key);
		return undefined;
	}
	return entry.body;
}

function searchCacheSet(key, body) {
	searchCache.set(key, { at: Date.now(), body });
	// 防膨胀:超过 50 条清掉最旧的(简单 FIFO)。
	if (searchCache.size > 50) {
		const oldest = searchCache.keys().next().value;
		if (oldest !== undefined) searchCache.delete(oldest);
	}
}

/**
 * 搜索历史会话(包装 ctx.sessionQuery.searchSessions)。
 * 返回标准化结果:每项携带会话元信息 + 最佳命中(摘要/类型/时间)。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {URL} url
 */
async function handleSearch(ctx, url) {
	const sessionQuery = ctx.get("sessionQuery");
	if (sessionQuery === undefined) throw new Error("会话检索服务不可用");
	const q = url.searchParams.get("q")?.trim() ?? "";
	if (q === "") {
		return { items: [], nextCursor: undefined };
	}
	const limit = parseLimit(url.searchParams.get("limit"));
	const ws = url.searchParams.get("ws")?.trim();
	const from = parseNum(url.searchParams.get("from"));
	const to = parseNum(url.searchParams.get("to"));
	// 归档语义(FR-SEARCH-5):搜索默认包含已归档;archived 参数过滤
	// (all/active/archived,缺省=all)。归档过滤在结果层做(官方 FTS 不区分
	// 归档)。all 模式保持用户 limit(与 FTS cursor 指纹一致);过滤模式
	// 一次取足 MAX_LIMIT 再本地过滤,不走 cursor。
	const archivedMode = url.searchParams.get("archived") === undefined ? "all" : parseArchivedMode(url);
	const archived = readArchivedSessionIds(ctx.get("settings")?.documentPath ?? fallbackDocumentPath(ctx));
	const keep = archivedFilter(archived, archivedMode);
	const fetchLimit = archivedMode === "all" ? limit : MAX_LIMIT;
	// 性能优化:相同参数搜索走 30s TTL 缓存,避免重复触发官方全量 reconcile。
	const cacheKey = searchCacheKey(q, ws, from, to, archivedMode, fetchLimit, url.searchParams.get("cursor"));
	const cached = searchCacheGet(cacheKey);
	if (cached !== undefined) return cached;
	const sessionFilters = [];
	if (ws) sessionFilters.push({ kind: "cwd", values: [ws] });
	if (from !== undefined || to !== undefined) {
		sessionFilters.push({
			kind: "created-at",
			...(from !== undefined ? { from } : {}),
			...(to !== undefined ? { to } : {})
		});
	}
	const result = await sessionQuery.searchSessions(
		{
			query: q,
			sessionFilters,
			limit: fetchLimit,
			...archivedMode === "all" && url.searchParams.get("cursor") ? { cursor: url.searchParams.get("cursor") } : {}
		},
		undefined
	);
	const hits = result.items ?? [];
	// 性能优化:不再宿主端逐会话读日志取标题(readTitleSnapshots 对持久化会话
	// 要读整个 zstd 日志,命中 N 会话 = N 次全量读取,是搜索第二慢大头)。
	// 标题由客户端用本地 sessions.list.byId 补齐(平台已维护,零读取)。
	const kept = hits.filter((hit) => keep(hit.header.id));
	// 归档过滤模式:一次取足 MAX_LIMIT 条,过滤后全量返回(≤100,本机量级足够),
	// 不走 FTS cursor(否则 cursor 的 limit 指纹与过滤后条目数不一致,翻页会跳数据)。
	const items = kept.slice(0, archivedMode === "all" ? limit : MAX_LIMIT).map((hit) => {
		const id = hit.header.id;
		return {
			sessionId: id,
			title: null, // 标题由客户端本地 sessions.list.byId 补齐(性能优化)
			cwd: hit.header.cwd ?? null,
			createdAt: hit.header.createdAt ?? null,
			live: hit.live === true,
			persisted: hit.persisted === true,
			archived: archived.has(id),
			bestMatch: hit.bestMatch
				? {
						seq: hit.bestMatch.seq,
						type: hit.bestMatch.type,
						time: hit.bestMatch.time ?? null,
						surface: hit.bestMatch.surface,
						snippet: hit.bestMatch.snippet
					}
				: null
		};
	});
	const body = {
		items,
		// 仅 all 模式透传 FTS cursor(limit 指纹一致,翻页安全)。
		...(archivedMode === "all" && result.nextCursor !== undefined ? { nextCursor: result.nextCursor } : {})
	};
	searchCacheSet(cacheKey, body);
	return body;
}

/** 读取设置(带默认值)。 */
function readSettings(ctx) {
	const settings = ctx.get("settings");
	const section = settings ? settings.get(NS) : null;
	return {
		enabled: section?.enabled !== false,
		scope: section?.scope === "current" ? "current" : "all"
	};
}

/**
 * 片段前后文(v1.1):读某个事件 + 前后文窗口。
 * 参数:sessionId, seq, before, after(before/after ∈ [0,50],缺省各 5)。
 * 返回:命中事件 + 前后文可读文本(对齐 readEvent 返回)。
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {URL} url
 */
async function handleContext(ctx, url) {
	const sessionQuery = ctx.get("sessionQuery");
	if (sessionQuery === undefined) throw new Error("会话检索服务不可用");
	const sessionId = url.searchParams.get("sessionId")?.trim();
	const seq = parseNum(url.searchParams.get("seq"));
	if (!sessionId || seq === undefined) throw new Error("sessionId 与 seq 必填");
	const clampWindow = (raw, fallback) => {
		const n = Number(raw);
		return Number.isSafeInteger(n) && n >= 0 && n <= 50 ? n : fallback;
	};
	const before = clampWindow(url.searchParams.get("before"), 5);
	const after = clampWindow(url.searchParams.get("after"), 5);
	const result = await sessionQuery.readEvent({ sessionId, seq, before, after }, undefined);
	// 提取可读文本:仅 user/assistant 消息与工具结果(对齐 FTS 索引口径),
	// 供前端灰字展示前后文。
	const textOf = (event) => {
		if (event?.type === "user/message") {
			const parts = event.data?.content ?? [];
			return parts.filter((b) => b?.type === "text").map((b) => b.text).join("\n");
		}
		if (event?.type === "assistant/message") {
			const parts = event.data?.message?.content ?? [];
			return parts.filter((b) => b?.type === "text").map((b) => b.text).join("\n");
		}
		return "";
	};
	const events = result.events ?? [];
	return {
		sessionId,
		seq,
		startSeq: result.startSeq ?? null,
		endSeq: result.endSeq ?? null,
		target: {
			seq: result.target?.seq ?? seq,
			type: result.target?.type ?? null,
			time: result.target?.time ?? null,
			text: textOf(result.target)
		},
		events: events.map((event) => ({
			seq: event.seq,
			type: event.type,
			time: event.time ?? null,
			text: textOf(event)
		}))
	};
}

// ── 插件入口 ──────────────────────────────────────────────────────────────

export function apply(ctx) {
	// 设置命名空间注册(可选服务:无 settings 提供方时自动跳过)。
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(NS, SettingsSchema);
	});

	// 环回路由:搜索 / 片段前后文 / 设置读写(绕开 Web 设置白名单)。
	// 最近会话已由客户端本地化(直接读 ctx.sessions.list),不再有宿主端点。
	ctx.inject(["webServer", "settings"], (webCtx) => {
		const route = {
			kind: "prefix",
			path: "/session-kb",
			handler: async (req, res) => {
				if (!isLoopback(req.socket?.remoteAddress ?? "")) {
					sendJson(res, 403, { ok: false, error: "仅允许本机访问" });
					return;
				}
				const url = new URL(req.url ?? "/", "http://x");
				const method = req.method ?? "GET";
				try {
					if (method === "GET" && url.pathname === "/session-kb/search") {
						sendJson(res, 200, { ok: true, ...(await handleSearch(webCtx, url)) });
						return;
					}
					// v1.1 片段前后文(readEvent 窗口)。
					if (method === "GET" && url.pathname === "/session-kb/context") {
						sendJson(res, 200, { ok: true, ...(await handleContext(webCtx, url)) });
						return;
					}
					if (url.pathname === "/session-kb/settings") {
						if (method === "GET") {
							sendJson(res, 200, { ok: true, ...readSettings(webCtx) });
							return;
						}
						if (method === "POST") {
							const body = await readBody(req);
							const settings = webCtx.get("settings");
							if (!settings) {
								sendJson(res, 500, { ok: false, error: "settings 服务不可用" });
								return;
							}
							const next = { ...(settings.get(NS) ?? {}) };
							if (typeof body.enabled === "boolean") next.enabled = body.enabled;
							if (body.scope === "all" || body.scope === "current") next.scope = body.scope;
							await settings.update(NS, next);
							sendJson(res, 200, { ok: true });
							return;
						}
					}
					sendJson(res, 404, { ok: false, error: "not found" });
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					const status = /SESSION_QUERY_SEARCH_DISABLED/.test(message) ? 503 : 500;
					sendJson(res, status, { ok: false, error: message, disabled: /SESSION_QUERY_SEARCH_DISABLED/.test(message) });
				}
			}
		};
		webCtx.effect(() => webCtx.webServer.register(route), "session-kb: routes");
	});
}
