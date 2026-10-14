import assert from "node:assert/strict";
import test from "node:test";
import { parseSimStored, startFrom } from "./sim-storage";

const good = {
	v: 1,
	base: {
		rev: "r1",
		lastSynced: "2026-10-14T00:00:00.000Z",
		records: [["song-a", "IN", 99.5, 15.2]],
	},
	edits: [
		{ id: "song-a", rank: "IN", acc: "99.9", difficulty: 15.2, song: "A" },
		{ id: "song-b", rank: "AT", acc: "" },
	],
};

test("a stored simulation round-trips", () => {
	const out = parseSimStored(JSON.stringify(good));
	assert.equal(out?.base.rev, "r1");
	assert.deepEqual(out?.base.records, good.base.records);
	assert.equal(out?.edits.length, 2);
	assert.equal(out?.edits[1]?.acc, "");
});

test("nothing, junk or another version reads as nothing stored", () => {
	assert.equal(parseSimStored(null), undefined);
	assert.equal(parseSimStored(""), undefined);
	assert.equal(parseSimStored("{"), undefined);
	assert.equal(parseSimStored("[]"), undefined);
	assert.equal(parseSimStored(JSON.stringify({ ...good, v: 2 })), undefined);
	assert.equal(
		parseSimStored(JSON.stringify({ ...good, base: { rev: 1, records: [] } })),
		undefined,
	);
});

test("a bad base record rejects the base; bad or repeated edits are skipped", () => {
	const bad = {
		...good,
		base: { ...good.base, records: [["song-a", "LEGACY", 99, 15]] },
	};
	assert.equal(parseSimStored(JSON.stringify(bad)), undefined);
	const edits = [
		{ id: "song-a", rank: "IN", acc: "99" },
		{ id: "song-a", rank: "IN", acc: "98" },
		{ id: "song-c", rank: "XX", acc: "99" },
		{ id: "song-d", rank: "IN", acc: 99 },
		{ id: "song-e", rank: "HD", acc: "12345678901" },
		null,
	];
	const out = parseSimStored(JSON.stringify({ ...good, edits }));
	assert.deepEqual(
		out?.edits.map((e) => [e.id, e.acc]),
		[["song-a", "99"]],
	);
});

test("a stored base without a typed accuracy follows the current save", () => {
	const current = { rev: "r2", records: [] };
	const old = parseSimStored(JSON.stringify(good));
	assert.ok(old);
	// No stored simulation: start from the server's save
	assert.deepEqual(startFrom(undefined, current), { base: current, edits: [] });
	// A typed accuracy keeps its own (older) base, so Sync has something to do
	assert.equal(startFrom(old, current).base.rev, "r1");
	assert.equal(startFrom(old, current).edits.length, 2);
	// Only blank rows: nothing to protect, so the base is the current one and the rows stay
	const blank = {
		...old,
		edits: [{ id: "song-b", rank: "AT" as const, acc: "" }],
	};
	const out = startFrom(blank, current);
	assert.equal(out.base.rev, "r2");
	assert.equal(out.edits.length, 1);
	// No edits at all
	assert.equal(startFrom({ ...old, edits: [] }, current).base.rev, "r2");
});

test("base records may carry the score; edits keep a typed score", () => {
	const withScores = {
		...good,
		base: {
			...good.base,
			records: [
				["song-a", "IN", 99.5, 15.2, 995_000],
				["song-b", "HD", 90, 10],
			],
		},
		edits: [
			{ id: "song-a", rank: "IN", acc: "99.9", score: "999000" },
			{ id: "song-b", rank: "HD", acc: "95", score: "12x" },
		],
	};
	const out = parseSimStored(JSON.stringify(withScores));
	assert.equal(out?.base.records[0]?.[4], 995_000);
	assert.equal(out?.base.records[1]?.[4], undefined);
	assert.equal(out?.edits[0]?.score, "999000");
	assert.equal(out?.edits[1]?.score, undefined);
	const bad = {
		...withScores,
		base: { ...withScores.base, records: [["a", "IN", 99, 15, 2_000_000]] },
	};
	assert.equal(parseSimStored(JSON.stringify(bad)), undefined);
});

test("an edit that repeats the stored save does not keep its base", () => {
	const current = { rev: "r2", records: [] };
	const stored = (acc: string) => {
		const out = parseSimStored(
			JSON.stringify({
				...good,
				base: { ...good.base, records: [["song-a", "IN", 99.5, 15.2]] },
				edits: [{ id: "song-a", rank: "IN", acc }],
			}),
		);
		assert.ok(out);
		return startFrom(out, current).base.rev;
	};
	assert.equal(stored("99.5"), "r2");
	assert.equal(stored("99.6"), "r1");
	assert.equal(stored(""), "r2");
});
