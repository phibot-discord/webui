import { LEVEL } from "@/phi/lib/const";
import { parseAcc, roundAcc } from "@/phi/lib/manual-score";
import {
	SIM_MAX_EDITS,
	type SimBase,
	type SimBaseRecord,
	type SimEdit,
} from "@/phi/lib/simulation";

/** The whole simulation, kept per account in this browser: the save it is based on, and the edits */
export type SimStored = { v: 1; base: SimBase; edits: SimEdit[] };

const MAX_RECORDS = 5000;

function storageKey(userId: string) {
	return `phi.web.sim.v1:${userId}`;
}

function isLevel(v: unknown): v is SimBaseRecord[1] {
	return (LEVEL as readonly unknown[]).includes(v);
}

function isRecord(v: unknown): v is SimBaseRecord {
	return (
		Array.isArray(v) &&
		(v.length === 4 ||
			(v.length === 5 &&
				typeof v[4] === "number" &&
				Number.isFinite(v[4]) &&
				v[4] >= 0 &&
				v[4] <= 1_000_000)) &&
		typeof v[0] === "string" &&
		isLevel(v[1]) &&
		typeof v[2] === "number" &&
		Number.isFinite(v[2]) &&
		v[2] >= 0 &&
		v[2] <= 100 &&
		typeof v[3] === "number" &&
		Number.isFinite(v[3]) &&
		v[3] > 0
	);
}

function asEdit(v: unknown): SimEdit | undefined {
	if (!v || typeof v !== "object") return;
	const o = v as Record<string, unknown>;
	if (typeof o.id !== "string" || !o.id || !isLevel(o.rank)) return;
	if (typeof o.acc !== "string" || o.acc.length > 10) return;
	const edit: SimEdit = { id: o.id, rank: o.rank, acc: o.acc };
	if (typeof o.score === "string" && /^\d{1,7}$/.test(o.score)) {
		edit.score = o.score;
	}
	if (typeof o.difficulty === "number" && o.difficulty > 0) {
		edit.difficulty = o.difficulty;
	}
	if (typeof o.song === "string") edit.song = o.song.slice(0, 100);
	return edit;
}

/** A save snapshot from storage or from `/api/sim`; anything off reads as no snapshot */
export function parseSimBase(v: unknown): SimBase | undefined {
	if (!v || typeof v !== "object") return;
	const base = v as Record<string, unknown>;
	if (typeof base.rev !== "string" || !Array.isArray(base.records)) return;
	if (base.records.length > MAX_RECORDS || !base.records.every(isRecord))
		return;
	return {
		rev: base.rev,
		lastSynced:
			typeof base.lastSynced === "string" ? base.lastSynced : undefined,
		records: base.records as SimBaseRecord[],
	};
}

/** Anything unreadable reads as nothing stored: the page then starts from the server's save */
export function parseSimStored(raw: string | null): SimStored | undefined {
	if (!raw) return;
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return;
	}
	if (!data || typeof data !== "object") return;
	const o = data as { v?: unknown; base?: unknown; edits?: unknown };
	const base = o.v === 1 ? parseSimBase(o.base) : undefined;
	if (!base) return;
	if (!Array.isArray(o.edits) || o.edits.length > SIM_MAX_EDITS) return;
	const seen = new Set<string>();
	const edits: SimEdit[] = [];
	for (const raw of o.edits) {
		const edit = asEdit(raw);
		const key = edit && `${edit.id}|${edit.rank}`;
		if (!edit || !key || seen.has(key)) continue;
		seen.add(key);
		edits.push(edit);
	}
	return { v: 1, base, edits };
}

export function startFrom(
	saved: SimStored | undefined,
	initial: SimBase,
): { base: SimBase; edits: SimEdit[] } {
	if (!saved) return { base: initial, edits: [] };
	// An edit that only repeats what the stored save has (a chart added from search starts so) changes nothing
	const changes = saved.edits.some((e) => {
		const acc = parseAcc(e.acc);
		if (acc == null) return false;
		const had = saved.base.records.find(
			(r) => r[0] === e.id && r[1] === e.rank,
		);
		return had == null || acc !== roundAcc(had[2]);
	});
	return { base: changes ? saved.base : initial, edits: saved.edits };
}

export function readSim(userId: string): SimStored | undefined {
	try {
		return parseSimStored(localStorage.getItem(storageKey(userId)));
	} catch {
		return;
	}
}

/** False when the browser refuses (private mode, quota): the simulation then only lives until the page closes */
export function writeSim(userId: string, stored: SimStored): boolean {
	try {
		localStorage.setItem(storageKey(userId), JSON.stringify(stored));
		return true;
	} catch {
		return false;
	}
}

export function clearSim(userId: string) {
	try {
		localStorage.removeItem(storageKey(userId));
	} catch {
		/* private mode */
	}
}
