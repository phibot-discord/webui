import { kvKey, LEVEL_NUM } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import {
	effectiveScore,
	isLevelKind,
	MANUAL_MAX_RECORDS,
	MANUAL_NAME_MAX,
	type ManualRecord,
	type ManualSaveData,
	manualRecordKey,
	rankingScoreOf,
	roundAcc,
	validAcc,
	validScore,
} from "@/phi/lib/manual-score";
import type { PhiRuntime } from "@/phi/lib/runtime";
import type { Save, SavePayload } from "@/phi/lib/save";
import { snapshotB30 } from "@/phi/lib/saves";
import type { Kv } from "@/server/sdk";
import { chartCell } from "./charts";
import { getDataHost } from "./data-host";
import { logger, withDiscordUid } from "./logger";
import { ensureSongInfo } from "./song-info";

const MANUAL = (userId: string) => kvKey("manualSave", userId);
const HISB30 = (userId: string) => kvKey("hisb30", userId);

export type ManualInput = {
	playerId?: unknown;
	records?: unknown;
};

export type ManualErr = {
	error: "bad_request" | "too_many" | "unknown_chart";
	status: number;
	detail?: string;
};

/** 10 s per process, so the card request right after a page view reads KV once */
const manualMem = new Map<string, { raw: string; at: number }>();
const MANUAL_MEMO_MS = 10_000;
const MANUAL_MEM_MAX = 256;
/** Bumped by every write and delete: a read already on the wire then is not remembered */
let manualGen = 0;

function rememberManual(userId: string, raw: string) {
	manualMem.delete(userId);
	manualMem.set(userId, { raw, at: Date.now() });
	while (manualMem.size > MANUAL_MEM_MAX) {
		const oldest = manualMem.keys().next().value;
		if (oldest === undefined) break;
		manualMem.delete(oldest);
	}
}

function forgetManual(userId: string) {
	manualGen += 1;
	manualMem.delete(userId);
}

export function resetManualMemForTest() {
	manualMem.clear();
}

/** `opts.memo` is for the card route only: pages and the editor must see writes from other instances */
export async function loadManual(
	db: Pick<Kv, "get">,
	userId: string,
	opts: { memo?: boolean } = {},
): Promise<ManualSaveData | undefined> {
	const hot = manualMem.get(userId);
	const hit = hot && opts.memo && Date.now() - hot.at < MANUAL_MEMO_MS;
	const gen = manualGen;
	const raw = hit ? hot.raw : await db.get(MANUAL(userId));
	if (!raw) {
		manualMem.delete(userId);
		return;
	}
	try {
		const parsed = JSON.parse(raw) as Partial<ManualSaveData>;
		if (parsed?.v !== 1 || !Array.isArray(parsed.records)) return;
		if (!hit && gen === manualGen) rememberManual(userId, raw);
		return {
			v: 1,
			playerId: String(parsed.playerId || "").slice(0, MANUAL_NAME_MAX),
			records: parsed.records.filter(
				(r): r is ManualRecord =>
					!!r &&
					typeof r.id === "string" &&
					isLevelKind(r.rank) &&
					validAcc(r.acc),
			),
			updatedAt: String(parsed.updatedAt || new Date().toISOString()),
			rks: Number(parsed.rks) || 0,
		};
	} catch {
		return;
	}
}

async function hasManual(db: Pick<Kv, "get">, userId: string) {
	return Boolean(await db.get(MANUAL(userId)));
}

function displayName(raw: unknown, fallback: string) {
	const name = String(raw ?? "")
		.replace(/[<>]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, MANUAL_NAME_MAX);
	return name || fallback;
}

export function normalizeManualInput(
	input: ManualInput,
	fallbackName: string,
): { playerId: string; records: ManualRecord[] } | ManualErr {
	if (!Array.isArray(input.records))
		return { error: "bad_request", status: 400 };
	if (input.records.length > MANUAL_MAX_RECORDS)
		return { error: "too_many", status: 400 };
	const seen = new Set<string>();
	const records: ManualRecord[] = [];
	for (const raw of input.records) {
		if (!raw || typeof raw !== "object")
			return { error: "bad_request", status: 400 };
		const r = raw as Record<string, unknown>;
		const id = typeof r.id === "string" ? r.id : "";
		if (!id || !isLevelKind(r.rank) || !validAcc(r.acc)) {
			return {
				error: "bad_request",
				status: 400,
				detail: `${id} ${String(r.rank)}`,
			};
		}
		if (r.score != null && r.score !== "" && !validScore(r.score)) {
			return { error: "bad_request", status: 400, detail: `${id} score` };
		}
		if (!chartCell(id, r.rank)) {
			return { error: "unknown_chart", status: 400, detail: `${id} ${r.rank}` };
		}
		const key = manualRecordKey(id, r.rank);
		if (seen.has(key)) continue;
		seen.add(key);
		const acc = roundAcc(r.acc);
		const rec: ManualRecord = { id, rank: r.rank, acc };
		if (validScore(r.score)) rec.score = r.score;
		if (r.fc === true || acc >= 100) rec.fc = true;
		records.push(rec);
	}
	return { playerId: displayName(input.playerId, fallbackName), records };
}

export function manualSavePayload(
	data: ManualSaveData,
	userId: string,
): SavePayload {
	const updatedAt = new Date(data.updatedAt);
	const stamp = Number.isFinite(updatedAt.getTime())
		? updatedAt.getTime()
		: Date.now();
	const gameRecord: NonNullable<SavePayload["gameRecord"]> = {};
	for (const rec of data.records) {
		const rows = gameRecord[rec.id] ?? [];
		gameRecord[rec.id] = rows;
		rows[LEVEL_NUM[rec.rank] ?? 0] = {
			acc: rec.acc,
			score: effectiveScore(rec),
			fc: rec.fc === true || rec.acc >= 100,
		};
	}
	return {
		session: `manual:${userId}`,
		saveInfo: {
			PlayerId: data.playerId,
			modifiedAt: { iso: new Date(stamp) },
			summary: {
				rankingScore: Number(data.rks) || 0,
				challengeModeRank: 0,
				updatedAt: new Date(stamp).toISOString(),
				saveVersion: 0,
				avatar: "Introduction",
			},
			gameFile: { url: `manual://${userId}/${stamp}` },
		},
		gameProgress: { money: [0, 0, 0, 0, 0] },
		gameuser: {
			name: data.playerId,
			version: 1,
			showPlayerId: true,
			selfIntro: "",
			avatar: "Introduction",
			background: "",
		},
		gameRecord,
	};
}

/** Without the catalog the stored RKS is shown: pages that only print the header do not load it */
export function manualSave(
	rt: PhiRuntime,
	data: ManualSaveData,
	userId: string,
): Save {
	const save = new rt.Save(manualSavePayload(data, userId));
	if (Object.keys(getInfo.ori_info).length) {
		const records = save.getRecord();
		save.saveInfo.summary.rankingScore = rankingScoreOf(records);
		const top = records[0];
		if (top) save.gameuser.background = getInfo.idgetsong(top.id) || "";
	}
	return save;
}

export async function saveManual(
	userId: string,
	input: ManualInput,
	fallbackName: string,
): Promise<{ ok: true; rks: number; count: number } | ManualErr> {
	return withDiscordUid(userId, async () => {
		await ensureSongInfo();
		const host = await getDataHost();
		const normalized = normalizeManualInput(input, fallbackName);
		if ("error" in normalized) return normalized;
		const data: ManualSaveData = {
			v: 1,
			playerId: normalized.playerId,
			records: normalized.records,
			updatedAt: new Date().toISOString(),
			rks: 0,
		};
		const save = manualSave(host.rt, data, userId);
		data.rks = save.saveInfo.summary.rankingScore;
		const raw = JSON.stringify(data);
		await host.db.set(MANUAL(userId), raw);
		forgetManual(userId);
		rememberManual(userId, raw);
		await snapshotB30(host.db, userId, save);
		logger.info(
			`manual save ${data.records.length} charts rks ${data.rks.toFixed(4)}`,
		);
		return { ok: true, rks: data.rks, count: data.records.length };
	});
}

export async function clearManual(userId: string): Promise<boolean> {
	const host = await getDataHost();
	forgetManual(userId);
	const had = await hasManual(host.db, userId);
	if (!had) return false;
	await host.db.del(MANUAL(userId));
	// A read that started before the delete must not bring the profile back
	forgetManual(userId);
	await host.db.del(HISB30(userId));
	return true;
}

export async function leaveManualMode(userId: string) {
	try {
		await clearManual(userId);
	} catch (err) {
		logger.warn(
			`manual cleanup skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
}
