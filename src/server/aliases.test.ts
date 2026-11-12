import assert from "node:assert/strict";
import test from "node:test";
import {
	type AliasDeps,
	ensureAliases,
	mergeAliasLayers,
	parseApprovedSnapshot,
	resetAliasesForTest,
	setAliasDepsForTest,
} from "./aliases";

const KNOWN = new Set(["A.x.0", "B.y.0", "Introduction.0"]);

function snapshot(
	sha: string,
	data: Record<string, string[]>,
	fetchedAt = "2026-10-06T00:00:00.000Z",
) {
	return Buffer.from(
		JSON.stringify({
			v: 1,
			sha,
			fetchedAt,
			upstreamEtag: 'W/"1-x"',
			songs: Object.keys(data).length,
			aliases: Object.values(data).flat().length,
			data,
		}),
	);
}

function deferred<T>() {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

function setup(overrides: Partial<AliasDeps> = {}) {
	resetAliasesForTest();
	const clock = { now: 1_000_000 };
	const calls = { approved: 0, base: 0 };
	const env = { sha: undefined as string | undefined, catalog: "cat1" };
	setAliasDepsForTest({
		ensureCatalog: async () => {},
		catalogRevision: () => env.catalog,
		aliasesSha: () => env.sha,
		readBase: () => {
			calls.base += 1;
			return { "A.x": ["ASA", 7, " ", null], Orphan: ["o"] };
		},
		getApproved: async () => {
			calls.approved += 1;
			return snapshot("approved-sha-1", { "A.x": ["asa", "new"] });
		},
		known: (id) => KNOWN.has(id),
		background: () => {},
		now: () => clock.now,
		coldWaitMs: 20,
		...overrides,
	});
	return { clock, calls, env };
}

test("parseApprovedSnapshot trims and rejects the whole snapshot on any bad entry", () => {
	const ok = parseApprovedSnapshot({
		v: 1,
		sha: "s",
		data: { "A.x": [" ASA ", "b"] },
	});
	assert.deepEqual(ok.data, { "A.x": ["ASA", "b"] });
	assert.equal(ok.sha, "s");
	const bad: unknown[] = [
		null,
		[],
		{ v: 2, sha: "s", data: {} },
		{ v: 1, data: {} },
		{ v: 1, sha: "s", data: [] },
		{ v: 1, sha: "s", data: { "A.x": "ASA" } },
		{ v: 1, sha: "s", data: { "A.x": ["ok", " "] } },
		{ v: 1, sha: "s", data: { "A.x": ["ok", 7] } },
		{ v: 1, sha: "s", data: { " ": ["x"] } },
	];
	for (const raw of bad) {
		assert.throws(() => parseApprovedSnapshot(raw), /invalid alias snapshot/);
	}
});

test("mergeAliasLayers keeps layer order, dedupes per song and drops orphans", () => {
	const { byId, orphans } = mergeAliasLayers(
		[
			{ layer: "base", data: { "A.x": ["ASA", 7, "", null, "Ain"] } },
			{
				layer: "approved",
				data: { "A.x.0": ["asa", "AIN", "无限光"], Introduction: ["intro"] },
			},
			{ layer: "approved", data: { "Gone.z": ["g"], "B.y": [] } },
		],
		(id) => KNOWN.has(id),
	);
	assert.deepEqual(byId.get("A.x.0"), [
		{ text: "ASA", layer: "base" },
		{ text: "7", layer: "base" },
		{ text: "Ain", layer: "base" },
		{ text: "无限光", layer: "approved" },
	]);
	assert.deepEqual(byId.get("Introduction.0"), [
		{ text: "intro", layer: "approved" },
	]);
	assert.equal(byId.has("B.y.0"), false);
	assert.deepEqual(orphans, ["Gone.z"]);
});

test("without an aliasesSha the bundled layer is served and R2 is never asked", async () => {
	const { calls } = setup();
	const index = await ensureAliases();
	assert.equal(calls.approved, 0);
	assert.equal(index.rev, "cat1|base");
	assert.equal(index.stale, false);
	assert.deepEqual(
		index.byId.get("A.x.0")?.map((a) => a.text),
		["ASA", "7"],
	);
	assert.equal(index.byId.has("Orphan.0"), false);
	await ensureAliases();
	assert.equal(calls.base, 1);
});

test("a cold start waits for the approved snapshot", async () => {
	const { calls, env } = setup();
	env.sha = "approved-sha-1";
	const index = await ensureAliases();
	assert.equal(calls.approved, 1);
	assert.equal(index.stale, false);
	assert.equal(index.rev, "cat1|approved-sha-1");
	assert.equal(index.approvedSha, "approved-sha-1");
	assert.deepEqual(index.byId.get("A.x.0"), [
		{ text: "ASA", layer: "base" },
		{ text: "7", layer: "base" },
		{ text: "new", layer: "approved" },
	]);
	await ensureAliases();
	assert.equal(calls.approved, 1);
});

test("a slow cold start serves the bundled layer as stale, then catches up", async () => {
	const slow = deferred<Buffer | undefined>();
	const { calls, env } = setup({
		getApproved: () => {
			calls.approved += 1;
			return slow.promise;
		},
	});
	env.sha = "approved-sha-1";
	const first = await ensureAliases();
	assert.equal(first.stale, true);
	assert.equal(first.rev, "cat1|base");
	const second = await ensureAliases();
	assert.equal(second.stale, true);
	assert.equal(calls.approved, 1);
	slow.resolve(snapshot("approved-sha-1", { "B.y": ["by"] }));
	await new Promise((r) => setImmediate(r));
	const third = await ensureAliases();
	assert.equal(third.stale, false);
	assert.equal(third.rev, "cat1|approved-sha-1");
	assert.deepEqual(third.byId.get("B.y.0"), [
		{ text: "by", layer: "approved" },
	]);
});

test("a new sha refreshes in the background, single-flight, serving the old index", async () => {
	const next = deferred<Buffer | undefined>();
	const background: Promise<unknown>[] = [];
	const { calls, env } = setup({
		background: (p) => {
			background.push(p);
		},
	});
	env.sha = "approved-sha-1";
	await ensureAliases();
	setAliasDepsForTest({
		ensureCatalog: async () => {},
		catalogRevision: () => env.catalog,
		aliasesSha: () => env.sha,
		readBase: () => ({}),
		getApproved: () => {
			calls.approved += 1;
			return next.promise;
		},
		known: (id) => KNOWN.has(id),
		background: (p) => {
			background.push(p);
		},
		now: () => 1_000_000,
		coldWaitMs: 20,
	});
	env.sha = "approved-sha-2";
	const [a, b] = await Promise.all([ensureAliases(), ensureAliases()]);
	assert.equal(calls.approved, 2);
	assert.equal(a.approvedSha, "approved-sha-1");
	assert.equal(b.approvedSha, "approved-sha-1");
	assert.equal(a.stale, true);
	next.resolve(snapshot("approved-sha-2", { "A.x": ["two"] }));
	await Promise.all(background);
	const after = await ensureAliases();
	assert.equal(after.approvedSha, "approved-sha-2");
	assert.equal(after.stale, false);
	assert.equal(calls.approved, 2);
});

test("an invalid or missing snapshot keeps the last good one and backs off", async () => {
	let body: Buffer | undefined = snapshot("approved-sha-1", { "A.x": ["one"] });
	const { calls, env, clock } = setup({
		getApproved: async () => {
			calls.approved += 1;
			return body;
		},
	});
	env.sha = "approved-sha-1";
	await ensureAliases();
	body = Buffer.from('{"v":1,"sha":"approved-sha-2","data":{"A.x":[""]}}');
	env.sha = "approved-sha-2";
	const kept = await ensureAliases();
	await new Promise((r) => setImmediate(r));
	assert.equal(kept.approvedSha, "approved-sha-1");
	const again = await ensureAliases();
	assert.equal(again.approvedSha, "approved-sha-1");
	assert.equal(again.stale, true);
	assert.equal(calls.approved, 2);

	body = undefined;
	clock.now += 60_000;
	await ensureAliases();
	await new Promise((r) => setImmediate(r));
	assert.equal(calls.approved, 3);
	assert.equal((await ensureAliases()).approvedSha, "approved-sha-1");

	body = snapshot("approved-sha-2", { "A.x": ["two"] });
	clock.now += 60_000;
	await ensureAliases();
	await new Promise((r) => setImmediate(r));
	const fixed = await ensureAliases();
	assert.equal(fixed.approvedSha, "approved-sha-2");
	assert.equal(fixed.stale, false);
});

test("an aliases.json newer than the _sync state it was fetched for is used, then settles", async () => {
	const { calls, env } = setup({
		getApproved: async () => {
			calls.approved += 1;
			return snapshot("approved-sha-2", { "A.x": ["two"] });
		},
	});
	env.sha = "approved-sha-1";
	const first = await ensureAliases();
	assert.equal(first.approvedSha, "approved-sha-2");
	assert.equal(first.stale, true);
	await ensureAliases();
	assert.equal(calls.approved, 1);
	env.sha = "approved-sha-2";
	const settled = await ensureAliases();
	assert.equal(settled.approvedSha, "approved-sha-2");
	assert.equal(settled.stale, false);
	assert.equal(calls.approved, 1);
});

test("an aliases.json older than _sync stays stale and is fetched again", async () => {
	let body = snapshot("old", { "A.x": ["old"] });
	const { calls, env, clock } = setup({
		getApproved: async () => {
			calls.approved += 1;
			return body;
		},
	});
	env.sha = "new";
	const first = await ensureAliases();
	assert.equal(first.approvedSha, "old");
	assert.equal(first.stale, true);
	assert.equal((await ensureAliases()).stale, true);
	assert.equal(calls.approved, 1);

	body = snapshot("new", { "A.x": ["new"] }, "2026-10-07T00:00:00.000Z");
	clock.now += 60_000;
	await ensureAliases();
	await new Promise((r) => setImmediate(r));
	const fixed = await ensureAliases();
	assert.equal(calls.approved, 2);
	assert.equal(fixed.approvedSha, "new");
	assert.equal(fixed.stale, false);

	body = snapshot("old", { "A.x": ["old"] });
	env.sha = "newer";
	clock.now += 60_000;
	await ensureAliases();
	await new Promise((r) => setImmediate(r));
	const kept = await ensureAliases();
	assert.equal(calls.approved, 3);
	assert.equal(kept.approvedSha, "new");
	assert.equal(kept.stale, true);
});

test("a catalog change re-reads the bundled layer and re-filters orphans", async () => {
	const { calls, env } = setup();
	await ensureAliases();
	KNOWN.add("Orphan.0");
	try {
		env.catalog = "cat2";
		const index = await ensureAliases();
		assert.equal(calls.base, 2);
		assert.equal(index.rev, "cat2|base");
		assert.deepEqual(index.byId.get("Orphan.0"), [
			{ text: "o", layer: "base" },
		]);
	} finally {
		KNOWN.delete("Orphan.0");
	}
});
