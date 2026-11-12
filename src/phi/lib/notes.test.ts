import assert from "node:assert/strict";
import test from "node:test";
import type { Kv } from "@/server/sdk";
import { DEFAULT_CARD_STYLE } from "./card-styles";
import { kvKey } from "./const";
import {
	B30_AVG_KINDS,
	b30AvgKindOf,
	getNotes,
	isB30AvgKind,
	patchNotes,
	setB30AvgKind,
	setCardQuality,
	setUserLocale,
} from "./notes";

function memKv() {
	const map = new Map<string, string>();
	const db = {
		get: async (k: string) => map.get(k),
		set: async (k: string, v: string) => {
			map.set(k, v);
		},
	} as unknown as Kv;
	return { map, db };
}

test("b30AvgKind accepts the peer modes, rank and none only", () => {
	assert.deepEqual([...B30_AVG_KINDS], ["all", "top", "rank", "none"]);
	// phib19 answers B30 averages with no figures: a stored one reads as Average
	assert.ok(!isB30AvgKind("b30"));
	for (const kind of B30_AVG_KINDS) assert.ok(isB30AvgKind(kind));
	assert.ok(!isB30AvgKind("Rank"));
	assert.ok(!isB30AvgKind(""));
	assert.ok(!isB30AvgKind(undefined));
});

test("getNotes keeps any stored mode; b30AvgKindOf reads unknown ones as all", async () => {
	const kv = memKv();
	assert.equal((await getNotes(kv.db, "u1")).b30AvgKind, "all");
	kv.map.set(kvKey("notes", "u1"), JSON.stringify({ b30AvgKind: "rank" }));
	assert.equal(b30AvgKindOf(await getNotes(kv.db, "u1")), "rank");
	// A mode the Discord bot stored: kept as is, used as "all"
	kv.map.set(kvKey("notes", "u1"), JSON.stringify({ b30AvgKind: "median" }));
	const notes = await getNotes(kv.db, "u1");
	assert.equal(notes.b30AvgKind, "median");
	assert.equal(b30AvgKindOf(notes), "all");
	await setCardQuality(kv.db, "u1", "high");
	const raw = JSON.parse(kv.map.get(kvKey("notes", "u1"))!);
	assert.equal(raw.b30AvgKind, "median");
	assert.equal(raw.cardQuality, "high");
});

test("setB30AvgKind stores the choice and keeps the other options", async () => {
	const kv = memKv();
	kv.map.set(
		kvKey("notes", "u2"),
		JSON.stringify({ cardQuality: "high", allowApiUsage: false }),
	);
	await setB30AvgKind(kv.db, "u2", "rank");
	const notes = await getNotes(kv.db, "u2");
	assert.equal(notes.b30AvgKind, "rank");
	assert.equal(notes.cardQuality, "high");
	assert.equal(notes.allowApiUsage, false);
});

function storedNotes(kv: ReturnType<typeof memKv>, userId: string) {
	return JSON.parse(kv.map.get(kvKey("notes", userId)) ?? "null");
}

test("patchNotes applies several options with one read and one write", async () => {
	const kv = memKv();
	const task = [
		{
			song: "s",
			finished: false,
			request: { type: "acc", rank: "IN", value: 1 },
		},
	];
	kv.map.set(
		kvKey("notes", "u3"),
		JSON.stringify({ sign_in: "x", task, cardQuality: "high" }),
	);
	let gets = 0;
	let sets = 0;
	const counted = {
		get: async (k: string) => {
			gets++;
			return kv.db.get(k);
		},
		set: async (k: string, v: string) => {
			sets++;
			await kv.db.set(k, v);
		},
	} as unknown as Kv;
	await patchNotes(counted, "u3", {
		showTagAnalysis: false,
		peerWait: true,
		b30AvgKind: "rank",
	});
	assert.equal(gets, 1);
	assert.equal(sets, 1);
	const raw = storedNotes(kv, "u3");
	assert.equal(raw.showTagAnalysis, false);
	assert.equal(raw.peerWait, true);
	assert.equal(raw.b30AvgKind, "rank");
	assert.equal(raw.sign_in, "x");
	assert.deepEqual(raw.task, task);
	assert.equal(raw.cardQuality, "high");
});

test("patchNotes drops a card style set back to the default", async () => {
	const kv = memKv();
	await patchNotes(kv.db, "u4", { cardStyle: { kind: "b30", style: "table" } });
	assert.deepEqual(storedNotes(kv, "u4").cardStyle, { b30: "table" });
	await patchNotes(kv.db, "u4", {
		cardStyle: { kind: "b30", style: DEFAULT_CARD_STYLE },
	});
	assert.equal("cardStyle" in storedNotes(kv, "u4"), false);
});

test("an option left out of the patch is not touched", async () => {
	const kv = memKv();
	kv.map.set(kvKey("notes", "u5"), JSON.stringify({ showTagAnalysis: false }));
	await patchNotes(kv.db, "u5", { peerWait: true });
	const raw = storedNotes(kv, "u5");
	assert.equal(raw.showTagAnalysis, false);
	assert.equal(raw.peerWait, true);
});

test("overlapping changes to one player's record all land", async () => {
	const kv = memKv();
	let gets = 0;
	let sets = 0;
	const counted = {
		get: async (k: string) => {
			gets++;
			return kv.db.get(k);
		},
		set: async (k: string, v: string) => {
			sets++;
			await kv.db.set(k, v);
		},
	} as unknown as Kv;
	await Promise.all([
		patchNotes(counted, "u7", { peerWait: true }),
		patchNotes(counted, "u7", { showTagAnalysis: false }),
		setUserLocale(counted, "u7", "ja"),
	]);
	const raw = storedNotes(kv, "u7");
	assert.equal(raw.peerWait, true);
	assert.equal(raw.showTagAnalysis, false);
	assert.equal(raw.locale, "ja");
	assert.equal(gets, 3);
	assert.equal(sets, 3);
});

test("changes for different players do not wait for each other", async () => {
	const kv = memKv();
	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const db = {
		get: async (k: string) => {
			if (k === kvKey("notes", "slow")) await gate;
			return kv.db.get(k);
		},
		set: async (k: string, v: string) => {
			await kv.db.set(k, v);
		},
	} as unknown as Kv;
	const slow = patchNotes(db, "slow", { peerWait: true });
	let fastDone = false;
	const fast = patchNotes(db, "fast", { peerWait: true }).then(() => {
		fastDone = true;
	});
	await new Promise((r) => setTimeout(r, 20));
	const doneWhileBlocked = fastDone;
	release();
	await Promise.all([slow, fast]);
	assert.equal(doneWhileBlocked, true);
	assert.equal(storedNotes(kv, "slow").peerWait, true);
	assert.equal(storedNotes(kv, "fast").peerWait, true);
});

test("a failed write does not hold up the next change for the same player", async () => {
	const kv = memKv();
	let sets = 0;
	const db = {
		get: async (k: string) => kv.db.get(k),
		set: async (k: string, v: string) => {
			sets++;
			if (sets === 1) throw new Error("kv down");
			await kv.db.set(k, v);
		},
	} as unknown as Kv;
	const first = patchNotes(db, "u8", { peerWait: true });
	const second = patchNotes(db, "u8", { showTagAnalysis: false });
	await assert.rejects(first);
	await second;
	const raw = storedNotes(kv, "u8");
	assert.equal(raw.showTagAnalysis, false);
	assert.equal("peerWait" in raw, false);
});

test("patchNotes stores the fields only the Discord bot sets today", async () => {
	const kv = memKv();
	kv.map.set(kvKey("notes", "u6"), JSON.stringify({ cardQuality: "high" }));
	await patchNotes(kv.db, "u6", {
		theme: "snow",
		b30AvgColor: "red",
		allowApiUsage: false,
		showB30Analysis: false,
	});
	const raw = storedNotes(kv, "u6");
	assert.equal(raw.theme, "snow");
	assert.equal(raw.b30AvgColor, "red");
	assert.equal(raw.allowApiUsage, false);
	assert.equal(raw.showB30Analysis, false);
	assert.equal(raw.cardQuality, "high");
});
