import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Bilingual, LOCALES, type Locale, localeTag } from "@/i18n/config";
import { THEME_COLORS } from "@/theme/config";

type Box = "captcha" | "attack" | "500s" | "1000s";
type Action = "retry" | "status" | "contact" | "home";
type Fact = "ray" | "ip" | "geo";

export type ErrorPage = {
	file: string;
	type: string;
	box?: Box;
	actions: Action[];
	facts: Fact[];
	label: Bilingual;
	title: Bilingual;
	body: Bilingual;
};

export type ErrorPageAssets = {
	regular: string;
	semibold: string;
	icon: string;
};

export const ERROR_PAGES_DIR = "public/cf-errors";

export const BOX_TOKENS: Record<Box, string> = {
	captcha: "::CAPTCHA_BOX::",
	attack: "::IM_UNDER_ATTACK_BOX::",
	"500s": "::CLOUDFLARE_ERROR_500S_BOX::",
	"1000s": "::CLOUDFLARE_ERROR_1000S_BOX::",
};

export const FACT_TOKENS: Record<Fact, string> = {
	ray: "::RAY_ID::",
	ip: "::CLIENT_IP::",
	geo: "::GEO::",
};

const SITE = "https://phibot.dev";

const ACTION_HREF: Record<Action, string> = {
	retry: "",
	status: `${SITE}/status`,
	contact: `${SITE}/legal#contact`,
	home: `${SITE}/`,
};

const UI = {
	brand: "PhiBot",
	actions: {
		retry: { en: "Try again", zh: "重试", ja: "再試行" },
		status: { en: "Status", zh: "运行状态", ja: "ステータス" },
		contact: { en: "Contact us", zh: "联系我们", ja: "お問い合わせ" },
		home: { en: "Home page", zh: "返回首页", ja: "ホームページ" },
	} satisfies Record<Action, Bilingual>,
	facts: {
		ray: { en: "Ray ID", zh: "Ray ID", ja: "Ray ID" },
		ip: { en: "Your IP", zh: "你的 IP", ja: "あなたの IP" },
		geo: { en: "Region", zh: "地区", ja: "地域" },
	} satisfies Record<Fact, Bilingual>,
	language: { en: "Language", zh: "语言", ja: "言語" } satisfies Bilingual,
	locales: { en: "EN", zh: "中文", ja: "日本語" } satisfies Bilingual,
	noscript: {
		en: "Turn on JavaScript and cookies, then reload the page.",
		zh: "请开启 JavaScript 和 Cookie，然后刷新页面",
		ja: "JavaScript と Cookie を有効にしてから、ページを再読み込みしてください。",
	} satisfies Bilingual,
};

const BLOCKED: Bilingual = {
	en: "403 · Blocked",
	zh: "403 · 已拦截",
	ja: "403 · ブロック",
};

const CHECK: Bilingual = {
	en: "Security check",
	zh: "安全验证",
	ja: "セキュリティチェック",
};

export const ERROR_PAGES: ErrorPage[] = [
	{
		file: "waf-block.html",
		type: "WAF block",
		actions: ["home", "contact"],
		facts: ["ray", "ip"],
		label: BLOCKED,
		title: {
			en: "This request was blocked",
			zh: "请求已被拦截",
			ja: "このリクエストはブロックされました",
		},
		body: {
			en: "A security rule stopped this request before it reached PhiBot. If you think that's a mistake, contact us with the Ray ID below.",
			zh: "这个请求在到达 PhiBot 之前被安全规则拦截了。如果你认为这是误判，请带上下方的 Ray ID 联系我们",
			ja: "セキュリティルールにより、このリクエストは PhiBot に届く前に止められました。誤りだと思われる場合は、下の Ray ID を添えてお問い合わせください。",
		},
	},
	{
		file: "ip-block.html",
		type: "IP/Country block",
		actions: ["home", "contact"],
		facts: ["ray", "ip", "geo"],
		label: BLOCKED,
		title: {
			en: "Your network can't reach PhiBot",
			zh: "你所在的网络无法访问 PhiBot",
			ja: "お使いのネットワークから PhiBot にはアクセスできません",
		},
		body: {
			en: "Requests from your IP address or region are blocked here. If you think that's a mistake, contact us with the Ray ID below.",
			zh: "来自你的 IP 地址或地区的请求在这里被拦截。如果你认为这是误判，请带上下方的 Ray ID 联系我们",
			ja: "お使いの IP アドレスまたは地域からのリクエストはブロックされています。誤りだと思われる場合は、下の Ray ID を添えてお問い合わせください。",
		},
	},
	{
		file: "ip-challenge.html",
		type: "IP/Country challenge",
		box: "captcha",
		actions: [],
		facts: ["ray", "ip", "geo"],
		label: CHECK,
		title: {
			en: "One quick check first",
			zh: "请先完成一次验证",
			ja: "まず確認をお願いします",
		},
		body: {
			en: "Requests from your network or region need a quick check before they reach PhiBot. Once it passes, the page loads on its own.",
			zh: "来自你所在网络或地区的请求需要先通过验证才能访问 PhiBot。验证通过后页面会自动加载",
			ja: "お使いのネットワークまたは地域からのリクエストは、PhiBot に届く前に確認が必要です。確認が済むとページが自動で読み込まれます。",
		},
	},
	{
		file: "500-errors.html",
		type: "500 class errors",
		box: "500s",
		actions: ["retry", "status"],
		facts: [],
		label: { en: "Server error", zh: "服务器错误", ja: "サーバーエラー" },
		title: {
			en: "PhiBot's server isn't responding",
			zh: "PhiBot 的服务器没有响应",
			ja: "PhiBot のサーバーが応答していません",
		},
		body: {
			en: "Cloudflare couldn't get a working answer from the server behind this address. This usually clears up within a few minutes.",
			zh: "Cloudflare 没能从这个地址背后的服务器拿到正常响应。通常几分钟内就会恢复",
			ja: "Cloudflare がこのアドレスの背後にあるサーバーから正常な応答を受け取れませんでした。通常は数分で復旧します。",
		},
	},
	{
		file: "1000-errors.html",
		type: "1000 class errors",
		box: "1000s",
		actions: ["retry", "contact"],
		facts: [],
		label: {
			en: "Cloudflare error",
			zh: "Cloudflare 错误",
			ja: "Cloudflare エラー",
		},
		title: {
			en: "Cloudflare couldn't complete this request",
			zh: "Cloudflare 无法完成这个请求",
			ja: "Cloudflare がこのリクエストを処理できませんでした",
		},
		body: {
			en: "A Cloudflare setting stopped it, either for this address or for your request. The details below name the exact error. If it keeps happening, contact us with the Ray ID.",
			zh: "原因可能是这个地址的设置，也可能是你的请求被 Cloudflare 拦下了，下方写有具体的错误。如果反复出现，请带上 Ray ID 联系我们",
			ja: "このアドレスの設定、またはリクエスト自体が原因で Cloudflare に止められました。具体的なエラーは下に表示されています。繰り返し起きる場合は、Ray ID を添えてお問い合わせください。",
		},
	},
	{
		file: "interactive-challenge.html",
		type: "Interactive challenge",
		box: "captcha",
		actions: [],
		facts: ["ray", "ip"],
		label: CHECK,
		title: {
			en: "Confirm you're human",
			zh: "请确认你是真人",
			ja: "人間であることを確認してください",
		},
		body: {
			en: "Complete the check below to continue to PhiBot.",
			zh: "完成下方的验证后即可继续访问 PhiBot",
			ja: "下の確認を済ませると PhiBot に進めます。",
		},
	},
	{
		file: "managed-challenge.html",
		type: "Managed challenge / I'm Under Attack Mode",
		box: "captcha",
		actions: [],
		facts: ["ray", "ip"],
		label: CHECK,
		title: {
			en: "Checking your connection",
			zh: "正在检查你的连接",
			ja: "接続を確認しています",
		},
		body: {
			en: "PhiBot is making sure this request comes from a real browser. It usually passes on its own; if a checkbox appears, tick it.",
			zh: "PhiBot 正在确认这个请求来自真实的浏览器。通常会自动通过；如果出现复选框，勾选即可",
			ja: "このリクエストが実際のブラウザーから送られているかを確認しています。通常は自動で完了します。チェックボックスが表示された場合はチェックしてください。",
		},
	},
	{
		file: "non-interactive-challenge.html",
		type: "Non-interactive challenge",
		box: "attack",
		actions: [],
		facts: ["ray", "ip"],
		label: CHECK,
		title: {
			en: "Checking your browser",
			zh: "正在检查你的浏览器",
			ja: "ブラウザーを確認しています",
		},
		body: {
			en: "This takes a few seconds and needs nothing from you. The page continues on its own.",
			zh: "只需几秒钟，无需任何操作，页面会自动继续",
			ja: "数秒で終わり、操作は必要ありません。ページは自動で続きます。",
		},
	},
	{
		file: "rate-limit.html",
		type: "Rate limiting block",
		actions: ["retry"],
		facts: ["ray", "ip"],
		label: {
			en: "429 · Rate limit",
			zh: "429 · 频率限制",
			ja: "429 · レート制限",
		},
		title: {
			en: "Too many requests",
			zh: "请求过于频繁",
			ja: "リクエストが多すぎます",
		},
		body: {
			en: "This address got more requests from you in a short time than it allows. Wait a minute, then try again.",
			zh: "你在短时间内发送的请求超过了限制。请等一分钟再试",
			ja: "短時間に許可された数を超えるリクエストがありました。1 分ほど待ってから再試行してください。",
		},
	},
];

export function readErrorPageAssets(root = process.cwd()): ErrorPageAssets {
	const font = (name: string) =>
		readFileSync(join(root, "src/fonts", name)).toString("base64");
	return {
		regular: font("outfit-latin-400.woff2"),
		semibold: font("outfit-latin-600.woff2"),
		icon: readFileSync(join(root, "src/app/icon.svg"), "utf8"),
	};
}

function esc(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function words(text: Bilingual): string {
	return LOCALES.map(
		(locale) =>
			`<span data-l="${locale}" lang="${localeTag(locale)}">${esc(text[locale])}</span>`,
	).join("");
}

function pageTitle(page: ErrorPage, locale: Locale): string {
	return `${page.title[locale]} · ${UI.brand}`;
}

function styles(assets: ErrorPageAssets): string {
	return `@font-face {
	font-family: "Outfit";
	src: url(data:font/woff2;base64,${assets.regular}) format("woff2");
	font-weight: 400;
	font-display: swap;
}

@font-face {
	font-family: "Outfit";
	src: url(data:font/woff2;base64,${assets.semibold}) format("woff2");
	font-weight: 500 700;
	font-display: swap;
}

:root {
	color-scheme: dark light;
	--bg: light-dark(oklch(0.978 0.004 240), oklch(0.16 0.02 256));
	--surface: light-dark(oklch(0.952 0.007 240), oklch(0.195 0.022 254));
	--surface-2: light-dark(oklch(0.915 0.011 242), oklch(0.24 0.024 252));
	--ink: light-dark(oklch(0.2 0.03 256), oklch(0.965 0.006 240));
	--muted: light-dark(oklch(0.45 0.03 250), oklch(0.74 0.02 245));
	--line: light-dark(oklch(0.87 0.013 245), oklch(0.3 0.02 252));
	--line-strong: light-dark(oklch(0.6 0.02 248), oklch(0.54 0.025 250));
	--primary: light-dark(oklch(0.46 0.1 215), oklch(0.87 0.085 204));
	--primary-hover: light-dark(oklch(0.4 0.1 215), oklch(0.93 0.07 204));
	--on-primary: light-dark(oklch(0.99 0 0), oklch(0.17 0.03 240));
	--primary-soft: light-dark(oklch(0.46 0.1 215 / 0.12), oklch(0.87 0.085 204 / 0.14));
	--mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	--gutter: 1rem;
	--ease: cubic-bezier(0.22, 1, 0.36, 1);
	--dur: 180ms;
}

@media (min-width: 768px) {
	:root {
		--gutter: 1.5rem;
	}
}

@media (prefers-contrast: more) {
	:root {
		--muted: light-dark(oklch(0.32 0.03 250), oklch(0.86 0.015 245));
		--line: light-dark(oklch(0.6 0.02 248), oklch(0.54 0.025 250));
		--line-strong: light-dark(oklch(0.4 0.03 250), oklch(0.75 0.02 248));
	}
}

*,
*::before,
*::after {
	box-sizing: border-box;
}

html {
	-webkit-text-size-adjust: 100%;
	text-size-adjust: 100%;
}

html,
body {
	margin: 0;
	min-height: 100%;
	background: var(--bg);
	color: var(--ink);
}

body {
	font-family:
		"Outfit", ui-sans-serif, system-ui, "Segoe UI", "PingFang SC",
		"Hiragino Sans GB", "Microsoft YaHei", sans-serif;
	font-size: 1rem;
	line-height: 1.5;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	-webkit-tap-highlight-color: transparent;
}

html[lang="zh-CN"] body {
	font-family:
		"Outfit", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
		ui-sans-serif, system-ui, sans-serif;
}

html[lang="ja"] body {
	font-family:
		"Outfit", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI",
		Meiryo, ui-sans-serif, system-ui, sans-serif;
}

[data-l]:not([data-l="en"]) {
	display: none;
}

html[data-lang="zh"] [data-l="en"],
html[data-lang="ja"] [data-l="en"] {
	display: none;
}

html[data-lang="zh"] [data-l="zh"],
html[data-lang="ja"] [data-l="ja"] {
	display: revert;
}

a {
	color: var(--primary);
	text-underline-offset: 0.18em;
	text-decoration-thickness: 0.08em;
}

:focus-visible {
	outline: 2px solid var(--primary);
	outline-offset: 2px;
}

::selection {
	background: color-mix(in srgb, var(--primary) 32%, transparent);
	color: var(--ink);
}

.frame {
	display: flex;
	flex-direction: column;
	width: min(75rem, calc(100% - 2 * var(--gutter)));
	min-height: 100vh;
	min-height: 100dvh;
	margin-inline: auto;
}

.bar {
	display: flex;
	align-items: center;
	min-height: 4rem;
	border-bottom: 1px solid var(--line);
}

.brand {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	min-height: 2.75rem;
	color: var(--ink);
	font-size: 1.125rem;
	font-weight: 600;
	letter-spacing: -0.02em;
	text-decoration: none;
}

.brand svg {
	width: 1.75rem;
	height: 1.75rem;
	flex: none;
}

main {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: flex-start;
	gap: 0.5rem;
	width: 100%;
	max-width: 42rem;
	padding-block: clamp(2.5rem, 1.5rem + 5vw, 5rem) 4rem;
}

.eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 0.75rem;
	margin: 0;
	color: var(--muted);
	font-size: 0.8125rem;
	font-weight: 600;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	font-variant-numeric: tabular-nums;
}

.eyebrow::before {
	content: "";
	width: 28px;
	height: 2px;
	background: var(--primary);
	transform: skewX(-24deg);
}

h1 {
	margin: 0;
	font-size: clamp(1.75rem, 1.45rem + 1.2vw, 2.25rem);
	font-weight: 600;
	line-height: 1.15;
	letter-spacing: -0.015em;
	text-wrap: balance;
}

html[lang="zh-CN"] h1,
html[lang="ja"] h1 {
	letter-spacing: 0;
}

html[lang="ja"] :is(h1, .lede) {
	word-break: auto-phrase;
}

.lede {
	max-width: 68ch;
	margin: 0 0 1rem;
	color: var(--muted);
	font-size: 1.0625rem;
	text-wrap: pretty;
}

.check {
	width: 100%;
	min-height: 4.5rem;
	margin: 0 0 1rem;
}

.cf {
	width: 100%;
	margin: 0 0 1.25rem;
	padding: 1rem 1.25rem;
	border: 1px solid var(--line);
	border-radius: 14px;
	background: var(--surface);
	font-size: 0.875rem;
	overflow-wrap: anywhere;
}

.cf :is(h1, h2, h3) {
	margin: 0 0 0.25rem;
	font-size: 1.0625rem;
	line-height: 1.3;
	letter-spacing: 0;
}

.cf p {
	margin: 0;
	color: var(--muted);
}

.cf ul {
	display: grid;
	gap: 0.25rem;
	margin: 0.75rem 0 0;
	padding: 0.75rem 0 0;
	border-top: 1px solid var(--line);
	list-style: none;
	color: var(--muted);
	font-family: var(--mono);
	font-size: 0.8125rem;
}

.cf :is(strong, b, span) {
	color: var(--ink);
}

.notice {
	margin: 0 0 1rem;
	color: var(--ink);
	font-size: 0.875rem;
}

.notice span {
	display: block;
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
}

.btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-height: 2.5rem;
	padding: 0 1rem;
	border: 1px solid transparent;
	border-radius: 5px;
	color: var(--ink);
	font-size: 0.9375rem;
	font-weight: 500;
	line-height: 1.25;
	text-decoration: none;
	white-space: nowrap;
	transition:
		background-color var(--dur) var(--ease),
		border-color var(--dur) var(--ease),
		color var(--dur) var(--ease),
		transform 150ms ease-out;
}

.btn-primary {
	background: var(--primary);
	color: var(--on-primary);
}

.btn-ghost {
	border-color: var(--line-strong);
}

@media (hover: hover) {
	.btn-primary:hover {
		background: var(--primary-hover);
		color: var(--on-primary);
	}

	.btn-ghost:hover {
		background: color-mix(in srgb, var(--surface-2) 70%, transparent);
		border-color: var(--muted);
		color: var(--ink);
	}
}

@media (prefers-reduced-motion: no-preference) {
	.btn:active {
		transform: scale(0.96);
	}
}

.facts {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem 2rem;
	width: 100%;
	margin: 2.5rem 0 0;
	padding-top: 1rem;
	border-top: 1px solid var(--line);
}

.facts div {
	min-width: 0;
}

.facts dt {
	color: var(--muted);
	font-size: 0.8125rem;
}

.facts dd {
	margin: 2px 0 0;
	font-family: var(--mono);
	font-size: 0.875rem;
	overflow-wrap: anywhere;
	user-select: all;
}

.foot {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem 1.5rem;
	padding-block: 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0px));
	border-top: 1px solid var(--line);
	color: var(--muted);
	font-size: 0.8125rem;
}

.foot a {
	color: inherit;
}

html:not(.js) .langs {
	display: none;
}

.langs {
	display: inline-flex;
	gap: 2px;
	padding: 2px;
	border: 1px solid var(--line-strong);
	border-radius: 5px;
}

.langs button {
	appearance: none;
	min-width: 2.25rem;
	height: 2rem;
	padding: 0 0.5rem;
	border: 0;
	border-radius: 3px;
	background: transparent;
	color: var(--muted);
	font: inherit;
	font-size: 0.8125rem;
	font-weight: 500;
	cursor: pointer;
	transition:
		background-color var(--dur) var(--ease),
		color var(--dur) var(--ease);
}

.langs button[aria-pressed="true"] {
	background: var(--primary-soft);
	box-shadow: inset 0 0 0 1px var(--primary);
	color: var(--ink);
	cursor: default;
}

@media (hover: hover) {
	.langs button[aria-pressed="false"]:hover {
		color: var(--ink);
	}
}

@media (pointer: coarse) {
	.btn {
		min-height: 2.75rem;
	}

	.langs button {
		height: 2.5rem;
	}
}`;
}

function mark(icon: string): string {
	return icon
		.replace(/<title>[^<]*<\/title>\s*/, "")
		.replace("<svg ", '<svg aria-hidden="true" focusable="false" ')
		.replace(/\n\s*/g, "");
}

function favicon(icon: string): string {
	return `data:image/svg+xml,${encodeURIComponent(icon.replace(/\n\s*/g, ""))}`;
}

function script(page: ErrorPage): string {
	const data = JSON.stringify({
		titles: Object.fromEntries(LOCALES.map((l) => [l, pageTitle(page, l)])),
		labels: UI.language,
		tags: Object.fromEntries(LOCALES.map((l) => [l, localeTag(l)])),
	}).replaceAll("<", "\\u003c");
	return `(function () {
	var data = ${data};
	var root = document.documentElement;
	function show(locale) {
		root.setAttribute("data-lang", locale);
		root.lang = data.tags[locale];
		document.title = data.titles[locale];
		var picks = document.querySelectorAll("[data-pick]");
		for (var i = 0; i < picks.length; i++) {
			picks[i].setAttribute("aria-pressed", String(picks[i].getAttribute("data-pick") === locale));
		}
		var group = document.querySelector(".langs");
		if (group) group.setAttribute("aria-label", data.labels[locale]);
	}
	var wanted = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
	var locale = "en";
	for (var i = 0; i < wanted.length; i++) {
		var code = String(wanted[i]).slice(0, 2).toLowerCase();
		if (Object.prototype.hasOwnProperty.call(data.tags, code)) {
			locale = code;
			break;
		}
	}
	show(locale);
	root.className += " js";
	document.addEventListener("click", function (event) {
		var target = event.target;
		var pick = target && target.closest ? target.closest("[data-pick]") : null;
		if (pick) show(pick.getAttribute("data-pick"));
	});
})();`;
}

function actions(page: ErrorPage): string {
	if (page.actions.length === 0) return "";
	const links = page.actions.map(
		(action, i) =>
			`<a class="btn ${i === 0 ? "btn-primary" : "btn-ghost"}" href="${ACTION_HREF[action]}">${words(UI.actions[action])}</a>`,
	);
	return `<div class="actions">${links.join("")}</div>`;
}

function facts(page: ErrorPage): string {
	if (page.facts.length === 0) return "";
	const rows = page.facts.map(
		(fact) =>
			`<div><dt>${words(UI.facts[fact])}</dt><dd>${FACT_TOKENS[fact]}</dd></div>`,
	);
	return `<dl class="facts">${rows.join("")}</dl>`;
}

function box(page: ErrorPage): string {
	if (!page.box) return "";
	const token = BOX_TOKENS[page.box];
	if (page.box === "500s" || page.box === "1000s") {
		return `<div class="cf">${token}</div>`;
	}
	const lines = LOCALES.map(
		(l) => `<span lang="${localeTag(l)}">${esc(UI.noscript[l])}</span>`,
	).join("");
	return `<div class="check">${token}</div><noscript><p class="notice">${lines}</p></noscript>`;
}

function picker(): string {
	const buttons = LOCALES.map(
		(l) =>
			`<button type="button" data-pick="${l}" lang="${localeTag(l)}" aria-pressed="${l === "en"}">${esc(UI.locales[l])}</button>`,
	);
	return `<div class="langs" role="group" aria-label="${esc(UI.language.en)}">${buttons.join("")}</div>`;
}

export function renderErrorPage(
	page: ErrorPage,
	assets: ErrorPageAssets,
): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${THEME_COLORS.dark}">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="${THEME_COLORS.light}">
<title>${esc(pageTitle(page, "en"))}</title>
<link rel="icon" type="image/svg+xml" href="${favicon(assets.icon)}">
<style>
${styles(assets)}
</style>
</head>
<body>
<div class="frame">
<header class="bar"><a class="brand" href="${SITE}/">${mark(assets.icon)}<span>${UI.brand}</span></a></header>
<main>
<p class="eyebrow">${words(page.label)}</p>
<h1>${words(page.title)}</h1>
<p class="lede">${words(page.body)}</p>
${box(page)}
${actions(page)}
${facts(page)}
</main>
<footer class="foot"><a href="${SITE}/">phibot.dev</a>${picker()}</footer>
</div>
<script>
${script(page)}
</script>
</body>
</html>
`;
}
