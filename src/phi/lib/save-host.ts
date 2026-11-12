import { isIP } from "node:net";
import { logger } from "@/server/logger";
import { TAPAPI_SAVE_TIMEOUT_MS, tapFetch, tapRemainMs } from "./tapapi";

export const SAVE_URL_REFUSED = "存档地址不受信任";
export const SAVE_REDIRECTS_REFUSED = "存档地址重定向次数过多";

const SAVE_MAX_REDIRECTS = 3;
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
const SEEN_HOSTS_MAX = 200;
const DNS_NAME =
	/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export type SaveUrlVerdict =
	| { ok: true; url: URL; host: string }
	| { ok: false; reason: string; host?: string };

export function saveHostAllowlist(raw = process.env.PHI_SAVE_HOSTS): string[] {
	return (raw ?? "")
		.split(",")
		.map((part) =>
			part
				.trim()
				.toLowerCase()
				.replace(/^\.+|\.+$/g, ""),
		)
		.filter(Boolean);
}

export function checkSaveUrl(
	raw: string,
	allow: readonly string[] = saveHostAllowlist(),
): SaveUrlVerdict {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return { ok: false, reason: "not a URL" };
	}
	if (url.protocol !== "https:") return { ok: false, reason: "not https" };
	if (url.username || url.password) return { ok: false, reason: "user info" };
	if (url.port) return { ok: false, reason: "port" };
	const host = url.hostname.replace(/\.$/, "");
	if (isIP(host.replace(/^\[|\]$/g, "")))
		return { ok: false, reason: "IP address" };
	if (host === "localhost" || host.endsWith(".localhost"))
		return { ok: false, reason: "localhost" };
	if (!DNS_NAME.test(host)) return { ok: false, reason: "not a host name" };
	if (allow.length && !allow.some((s) => host === s || host.endsWith(`.${s}`)))
		return { ok: false, reason: "not allowed", host };
	return { ok: true, url, host };
}

const seenHosts = new Set<string>();

export function noteSaveHost(host: string, region: string): boolean {
	const key = `${region} ${host}`;
	if (seenHosts.has(key) || seenHosts.size >= SEEN_HOSTS_MAX) return false;
	seenHosts.add(key);
	logger.info(`save host ${key}`);
	return true;
}

export function resetSaveHostsForTest() {
	seenHosts.clear();
}

function allowedSaveUrl(raw: string, region: string): URL {
	const verdict = checkSaveUrl(raw);
	if (verdict.host) noteSaveHost(verdict.host, region);
	if (verdict.ok) return verdict.url;
	logger.warn(`save url refused ${region}: ${verdict.reason} ${hostOf(raw)}`);
	throw new Error(SAVE_URL_REFUSED);
}

function hostOf(raw: string): string {
	try {
		return new URL(raw).host || "-";
	} catch {
		return "-";
	}
}

function nextHop(location: string, from: URL): string {
	try {
		return new URL(location, from).href;
	} catch {
		return location;
	}
}

export async function fetchSaveFile(
	raw: string | URL,
	global?: boolean,
): Promise<Response> {
	const region = global == null ? "-" : global ? "gb" : "cn";
	const started = performance.now();
	let url = allowedSaveUrl(String(raw), region);
	for (let hop = 0; hop <= SAVE_MAX_REDIRECTS; hop++) {
		const res = await tapFetch(
			url,
			{ redirect: "manual" },
			tapRemainMs(started, TAPAPI_SAVE_TIMEOUT_MS),
		);
		const location = REDIRECT_STATUS.has(res.status)
			? res.headers.get("location")
			: null;
		if (!location) return res;
		url = allowedSaveUrl(nextHop(location, url), region);
	}
	throw new Error(SAVE_REDIRECTS_REFUSED);
}
