import { REFRESH_COOLDOWN_MS } from "@/lib/save-refresh";
import { kvKey } from "@/phi/lib/const";
import type { Save } from "@/phi/lib/save";
import type { DataHost } from "./data-host";
import { getDataHost } from "./data-host";
import { ensureSongInfo } from "./song-info";

export { REFRESH_COOLDOWN_MS };

export type ErrorCode =
	| "not_bound"
	| "banned"
	| "no_save"
	| "hisb30_empty"
	| "refresh_cooldown"
	| "refresh_failed"
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
	const iso = save.saveInfo?.modifiedAt?.iso;
	const ms =
		iso instanceof Date
			? iso.getTime()
			: Date.parse(String(iso || save.saveInfo?.summary?.updatedAt || ""));
	const url = String(
		(save.saveInfo as { gameFile?: { url?: string } } | undefined)?.gameFile
			?.url || "",
	);
	return `${url}|${Number.isFinite(ms) ? ms : ""}`;
}

export function lastSyncedIso(save: Save): string | undefined {
	const iso =
		save.saveInfo?.modifiedAt?.iso || save.saveInfo?.summary?.updatedAt;
	if (!iso) return undefined;
	const d = iso instanceof Date ? iso : new Date(String(iso));
	return Number.isFinite(d.getTime()) ? d.toISOString() : String(iso);
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
	if (await host.rt.store.isSessionTokenBanned(token)) {
		return { error: "banned", status: 403, reason: "banned" };
	}
	const save = await host.lib.loadSave(host.rt, host.db, userId);
	if (!save) {
		return { error: "no_save", status: 409, reason: "no_save" };
	}
	return { save, token };
}

export async function refreshSave(
	userId: string,
): Promise<{ ok: true; lastSynced?: string } | BoundErr> {
	const host = await getDataHost();
	const token = await host.rt.store.getSessionToken(userId);
	if (!token) return { error: "not_bound", status: 409, reason: "not_bound" };
	if (await host.rt.store.isSessionTokenBanned(token)) {
		return { error: "banned", status: 403, reason: "banned" };
	}
	const coolKey = kvKey("webRefresh", userId);
	const locked = await host.store.set(coolKey, "1", {
		nx: true,
		ttlMs: REFRESH_COOLDOWN_MS,
	});
	if (locked !== "OK") {
		const remain = await refreshCooldownRemaining(userId);
		return {
			error: "refresh_cooldown",
			status: 429,
			reason: "refresh_cooldown",
			retryAfter: Math.max(1, Math.ceil(remain / 1000)),
		};
	}
	try {
		await ensureSongInfo();
		const save = await host.lib.updateSave(host.rt, host.db, userId);
		await host.store.set(kvKey("webCardEpoch", userId), String(Date.now()));
		return { ok: true, lastSynced: lastSyncedIso(save) };
	} catch (err) {
		await host.store.del(coolKey);
		const detail = err instanceof Error ? err.message : undefined;
		return {
			error: "refresh_failed",
			status: 502,
			reason: "refresh_failed",
			detail,
		};
	}
}

export async function refreshCooldownRemaining(
	userId: string,
): Promise<number> {
	const host = await getDataHost();
	const n = await host.store.ttlMs(kvKey("webRefresh", userId));
	return n > 0 ? n : 0;
}
