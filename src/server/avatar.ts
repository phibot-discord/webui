import { createHash } from "node:crypto";
import { kvKey } from "@/phi/lib/const";
import { isTapUserId } from "./auth-tickets";
import { getDataHost } from "./data-host";
import { logger } from "./logger";

/**
 * Header avatars. A Discord user shows its Discord avatar however it signed
 * in, else the TapTap one. The header loads this site's copy: TapTap's CDN
 * refuses a request that names another site as the referrer
 */

/** Discord user → the Discord avatar its Discord sign-in carried */
const DISCORD_AVATAR = (discordId: string) =>
	kvKey("webDiscordAvatar", discordId);
/** Avatar image by source URL. Both CDNs put the avatar's hash in the URL */
const AVATAR_IMAGE = (src: string) => kvKey("webAvatarImage", sourceHash(src));
const AVATAR_TTL_MS = 30 * 24 * 3600_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 256 * 1024;
/** Raster only: an SVG served from this origin could run script */
const IMAGE_TYPES = /^image\/(png|jpeg|gif|webp)$/;
const DISCORD_CDN = "cdn.discordapp.com";
const TAP_CDN = /(^|\.)tapimg\.(com|net)$/;

export type AvatarImage = { type: string; body: Buffer };

function sourceHash(src: string) {
	return createHash("sha256").update(src).digest("base64url").slice(0, 22);
}

function sourceHost(src: string | null | undefined): string | undefined {
	if (!src) return;
	try {
		const url = new URL(src);
		return url.protocol === "https:" ? url.hostname : undefined;
	} catch {
		return;
	}
}

function isDiscordAvatar(src: string | null | undefined): src is string {
	return sourceHost(src) === DISCORD_CDN;
}

function isAvatarSource(src: string | null | undefined): src is string {
	const host = sourceHost(src);
	return host === DISCORD_CDN || TAP_CDN.test(host || "");
}

/** What the header loads for a session's avatar; the version changes with the source */
export function avatarPath(src: string | null | undefined): string | undefined {
	if (!isAvatarSource(src)) return;
	return `/api/me/avatar?v=${sourceHash(src).slice(0, 12)}`;
}

/**
 * Keeps the Discord avatar a Discord session shows, for TapTap sign-ins to
 * the same user. `replace: false` only fills a gap: a session older than the
 * last Discord sign-in must not put an old avatar back. Never throws
 */
export async function rememberDiscordAvatar(
	discordId: string,
	src: string | null | undefined,
	{ replace = true }: { replace?: boolean } = {},
) {
	if (isTapUserId(discordId) || !isDiscordAvatar(src)) return;
	try {
		const host = await getDataHost();
		const kept = await host.db.get(DISCORD_AVATAR(discordId));
		if (kept === src || (kept && !replace)) return;
		await host.db.set(DISCORD_AVATAR(discordId), src);
	} catch (err) {
		logger.warn(
			`discord avatar not kept: ${err instanceof Error ? err.message : err}`,
		);
	}
}

/** The avatar a TapTap sign-in shows: the user's Discord one when known, else TapTap's */
export async function signInAvatar(
	userId: string,
	tapAvatar: string | undefined,
): Promise<string | undefined> {
	if (isTapUserId(userId)) return tapAvatar;
	try {
		const host = await getDataHost();
		return (await host.db.get(DISCORD_AVATAR(userId))) || tapAvatar;
	} catch {
		return tapAvatar;
	}
}

async function fetchAvatar(src: string): Promise<AvatarImage | undefined> {
	const url = new URL(src);
	// The header shows 28 px
	if (url.hostname === DISCORD_CDN) url.searchParams.set("size", "64");
	try {
		// No referrer from here, which is all TapTap's CDN asks
		const res = await fetch(url, {
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		const type = res.headers.get("content-type")?.split(";")[0]?.trim() || "";
		// A declared size over the cap is refused before the body is buffered
		const size = Number(res.headers.get("content-length"));
		if (!res.ok || !IMAGE_TYPES.test(type) || size > MAX_BYTES) {
			await res.body?.cancel().catch(() => undefined);
			logger.warn(`avatar fetch ${res.status} ${type || "-"}`);
			return;
		}
		const body = Buffer.from(await res.arrayBuffer());
		if (!body.byteLength || body.byteLength > MAX_BYTES) return;
		return { type, body };
	} catch (err) {
		logger.warn(
			`avatar fetch failed: ${err instanceof Error ? err.message : err}`,
		);
		return;
	}
}

/** The image for a session's avatar: from KV, else fetched once and kept a month */
export async function avatarImage(
	src: string | null | undefined,
): Promise<AvatarImage | undefined> {
	if (!isAvatarSource(src)) return;
	const host = await getDataHost();
	const raw = await host.db.get(AVATAR_IMAGE(src));
	if (raw) {
		try {
			const kept = JSON.parse(raw) as { type: string; data: string };
			return { type: kept.type, body: Buffer.from(kept.data, "base64") };
		} catch {
			/* refetch below */
		}
	}
	const image = await fetchAvatar(src);
	if (!image) return;
	const kept = { type: image.type, data: image.body.toString("base64") };
	await host.db
		.set(AVATAR_IMAGE(src), JSON.stringify(kept), AVATAR_TTL_MS)
		.catch(() => undefined);
	return image;
}
