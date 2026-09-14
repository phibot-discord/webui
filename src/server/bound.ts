import { kvKey } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import { saveIdentity } from "@/phi/lib/saves";
import { isTapApiFailure } from "@/phi/lib/tapapi";
import {
	BYPASS_CACHE_COOLDOWN_MS,
	claimCooldown,
	cooldownRemaining,
	REFRESH_COOLDOWN_MS,
	retryAfterSec,
} from "./cooldown";
import type { DataHost } from "./data-host";
import { getDataHost } from "./data-host";
import { ensureSongInfo } from "./song-info";

export { BYPASS_CACHE_COOLDOWN_MS, REFRESH_COOLDOWN_MS };

export type ErrorCode =
	| "not_bound"
	| "banned"
	| "no_save"
	| "hisb30_empty"
	| "refresh_cooldown"
	| "cache_bypass_cooldown"
	| "refresh_failed"
	| "tapapi_unavailable"
	| "unauthorized"
	| "unknown_card"
	| "rate_limit"
	| "share_not_found"
	| "profile_unavailable"
	| "render_failed";

export type BoundErr = {
	error: ErrorCode;
	status: number;
	retryAfter?: number;
	reason?: ErrorCode;
	detail?: string;
};

export function saveRevision(save: Save): string {
	return saveIdentity(save.saveInfo);
}

export function lastSyncedIso(save: Save): string | undefined {
	const iso =
		save.saveInfo?.modifiedAt?.iso || save.saveInfo?.summary?.updatedAt;
	if (!iso) return undefined;
	const d = iso instanceof Date ? iso : new Date(String(iso));
	return Number.isFinite(d.getTime()) ? d.toISOString() : String(iso);
}

export function resolveCardEpoch(
	requested: string | undefined,
	stored: string,
): string {
	const q = requested?.trim() ?? "";
	if (/^\d{10,16}$/.test(q)) return q;
	return stored;
}

export async function getCardEpoch(
	store: { get: (key: string) => Promise<unknown> },
	userId: string,
): Promise<string> {
	const raw = await store.get(kvKey("webCardEpoch", userId));
	return raw == null ? "" : String(raw);
}

export async function loadBound(
	host: DataHost,
	userId: string,
): Promise<{ save: Save; token: string } | BoundErr> {
	const token = (await host.rt.store.getSessionToken(userId)) || undefined;
	if (!token) {
		return { error: "not_bound", status: 409, reason: "not_bound" };
	}
	const [banned, save] = await Promise.all([
		host.rt.store.isSessionTokenBanned(token),
		host.lib.loadSave(host.rt, host.db, userId),
	]);
	if (banned) {
		return { error: "banned", status: 403, reason: "banned" };
	}
	if (!save) {
		return { error: "no_save", status: 409, reason: "no_save" };
	}
	return { save, token };
}

async function bumpCardEpoch(
	store: { set: (key: string, value: string) => Promise<unknown> },
	userId: string,
) {
	const epoch = String(Date.now());
	await store.set(kvKey("webCardEpoch", userId), epoch);
	return epoch;
}

export async function refreshSave(
	userId: string,
): Promise<
	| { ok: true; lastSynced?: string; epoch: string; cooldownMs: number }
	| BoundErr
> {
	const host = await getDataHost();
	const token = await host.rt.store.getSessionToken(userId);
	if (!token) return { error: "not_bound", status: 409, reason: "not_bound" };
	if (await host.rt.store.isSessionTokenBanned(token)) {
		return { error: "banned", status: 403, reason: "banned" };
	}
	const coolKey = kvKey("webRefresh", userId);
	const claimed = await claimCooldown(host.store, coolKey, REFRESH_COOLDOWN_MS);
	if (!claimed.ok) {
		return {
			error: "refresh_cooldown",
			status: 429,
			reason: "refresh_cooldown",
			retryAfter: retryAfterSec(claimed.remainMs),
		};
	}
	try {
		await ensureSongInfo();
		const save = await host.lib.updateSave(host.rt, host.db, userId);
		const epoch = await getCardEpoch(host.store, userId);
		return {
			ok: true,
			lastSynced: lastSyncedIso(save),
			epoch,
			cooldownMs: claimed.remainMs,
		};
	} catch (err) {
		await host.store.del(coolKey);
		if (isTapApiFailure(err)) {
			return {
				error: "tapapi_unavailable",
				status: 502,
				reason: "tapapi_unavailable",
			};
		}
		const detail = err instanceof Error ? err.message : undefined;
		return {
			error: "refresh_failed",
			status: 502,
			reason: "refresh_failed",
			detail,
		};
	}
}

export async function bypassCardCache(
	userId: string,
): Promise<{ ok: true; epoch: string; cooldownMs: number } | BoundErr> {
	const host = await getDataHost();
	const bound = await loadBound(host, userId);
	if ("error" in bound) return bound;
	const coolKey = kvKey("webCardBust", userId);
	const claimed = await claimCooldown(
		host.store,
		coolKey,
		BYPASS_CACHE_COOLDOWN_MS,
	);
	if (!claimed.ok) {
		return {
			error: "cache_bypass_cooldown",
			status: 429,
			reason: "cache_bypass_cooldown",
			retryAfter: retryAfterSec(claimed.remainMs),
		};
	}
	const epoch = await bumpCardEpoch(host.store, userId);
	return { ok: true, epoch, cooldownMs: claimed.remainMs };
}

export async function refreshCooldownRemaining(
	userId: string,
): Promise<number> {
	const host = await getDataHost();
	return cooldownRemaining(host.store, kvKey("webRefresh", userId));
}

export async function bypassCacheCooldownRemaining(
	userId: string,
): Promise<number> {
	const host = await getDataHost();
	return cooldownRemaining(host.store, kvKey("webCardBust", userId));
}
