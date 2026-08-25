#!/usr/bin/env node
/**
 * dsh-session-kb — 设置导航「会话库」图标补丁(一键检测 + 重打)。
 *
 * 背景:DSH 设置导航图标由核心壳插件硬编码(dsh-client-ui-settings-general 的
 * navIcon(id)),非 models/agent-presets/plugins 的分区一律回退齿轮;没有插件
 * 注册图标的 API。`dependencies/dsh` 由桌面应用整树下载,每次升级都会覆盖
 * 本补丁,导致「会话库」图标变回齿轮——升级后跑一次本脚本即可恢复。
 * 先例:dsh-personal-center/scripts/patch-nav-icon.mjs(同机制)。
 *
 * 用法:
 *   node scripts/patch-nav-icon.mjs
 *
 * 行为:幂等——已打过补丁则直接退出;未打则插入 `navIcon(id)` 的
 * session-kb 分支(会话库图标 SVG,currentColor 深浅色自适应),并做语法校验。
 * 生效:核心包改动 → 刷新页面即可。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

// 目标文件(与 PLATFORM-NOTES 一致:dependencies/dsh 由发布源下载)。
// 布局随版本演变,按存在性依次探测:
//   1. macOS 桌面端固定路径:<AppSupport>/dependencies/dsh/...;
//   2. 旧布局(≤0.6.x):DSH_HOME = <AppSupport>/data/dsh,核心依赖在其上两级;
//   3. 直接把 DSH_HOME 当安装根尝试一次。
// 注意:0.7.0 起 DSH_HOME = ~/.dsh(用户数据),不能再用 dirname×2 推导核心依赖路径。
function targetFile() {
	const candidates = [
		join(homedir(), "Library", "Application Support", "io.github.hairyf.deepseek-harness-desktop", "dependencies", "dsh", "node_modules", "@deepseek-ai", "dsh-client-ui-settings-general", "lib", "client.js")
	];
	const home = process.env.DSH_HOME;
	if (home) {
		candidates.push(
			join(dirname(dirname(home)), "dependencies", "dsh", "node_modules", "@deepseek-ai", "dsh-client-ui-settings-general", "lib", "client.js"),
			join(home, "dependencies", "dsh", "node_modules", "@deepseek-ai", "dsh-client-ui-settings-general", "lib", "client.js")
		);
	}
	for (const candidate of candidates) {
		if (existsSync(candidate)) return candidate;
	}
	return candidates[0];
}

/** 补丁块:会话库图标(与 lib/client.js 的 SessionKbIcon 同款路径,currentColor)。 */
const PATCH_BLOCK = `			/* dsh-session-kb patch: 会话库分区导航图标(SVG,currentColor 深浅色自适应) */
			if (id === "session-kb") return (0, react_jsx_runtime.jsx)("svg", {
				className: SettingsRoot_module_css_default.navIcon,
				width: 16,
				height: 16,
				viewBox: "0 0 40 40",
				fill: "none",
				children: [(0, react_jsx_runtime.jsx)("path", {
					d: "M34 27.752C35.2743 25.4555 36 22.8125 36 20C36 11.1634 28.8366 4 20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36C22.9605 36 25.7331 35.196 28.1115 33.7944C30.308 32.5 32.5 33.5 34 35",
					stroke: "currentColor",
					strokeWidth: 3.5,
					strokeLinecap: "round",
					strokeLinejoin: "round"
				}), (0, react_jsx_runtime.jsx)("path", {
					d: "M13 20.5H27",
					stroke: "currentColor",
					strokeWidth: 3.5
				}), (0, react_jsx_runtime.jsx)("path", {
					d: "M20.0049 13.505L20.0049 27.505",
					stroke: "currentColor",
					strokeWidth: 3.5
				})]
			});
`;

function main() {
	const file = targetFile();
	if (!existsSync(file)) {
		console.error("✗ 找不到核心文件:", file);
		console.error("  请确认 DSH 桌面端已安装(或设置 DSH_HOME 环境变量后重试)。");
		process.exit(1);
	}
	let src = readFileSync(file, "utf8");

	if (src.includes('id === "session-kb"')) {
		console.log("✓ 补丁已存在,无需重打:", file);
		return;
	}

	// 插入点:齿轮回退返回之前(不干扰 personal-center 等既有补丁分支)。
	const marker = 'return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16';
	const idx = src.indexOf(marker);
	if (idx < 0) {
		console.error("✗ 未找到 navIcon 的齿轮回退分支,核心文件结构可能已变(版本升级)。");
		console.error("  请人工对照 navIcon(id) 函数检查插入点。");
		process.exit(1);
	}
	src = src.slice(0, idx) + PATCH_BLOCK + src.slice(idx);
	writeFileSync(file, src);

	// 语法校验
	try {
		execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
	} catch (e) {
		console.error("✗ 补丁后语法校验失败,已写回文件但请勿刷新使用。请人工检查:", file);
		console.error(String(e.stderr || e));
		process.exit(1);
	}
	console.log("✓ 补丁已写入并通过 node --check:", file);
	console.log("  刷新页面即可生效(核心包改动,客户端 bundle 由 /plugins 提供)。");
}

main();
