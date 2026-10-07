import assert from "node:assert/strict";
import test from "node:test";
import {
	type AliasDeps,
	aliasesR2Key,
	ensureAliases,
	liveAliasKey,
	mergeAliasLayers,
	parseApprovedSnapshot,
	resetAliasesForTest,
	resolveAliasLive,
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
	const calls = { approved: 0, base: 0, resolve: 0 };
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
		liveBudgetMs: 20,
		...overrides,
	});
	return { clock, calls, env };
}

test("aliases.json lives next to the other info files", () => {
	assert.equal(aliasesR2Key("info/"), "info/aliases.json");
});

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
	// Read _sync/info.json just before ill-sync replaced aliases.json
	env.sha = "approved-sha-1";
	const first = await ensureAliases();
	assert.equal(first.approvedSha, "approved-sha-2");
	assert.equal(first.stale, true);
	// No refetch inside the back-off
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

	// A stale read of the older file never replaces the newer one already held
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

function resolveDeps(
	reply: (alias: string) => Promise<{ status: number; body: unknown }>,
) {
	const seen: string[] = [];
	const ctx = setup({
		fetchResolve: async (alias) => {
			seen.push(alias);
			return reply(alias);
		},
	});
	return { ...ctx, seen };
}

const RESOLVE_ASA = {
	status: 200,
	body: {
		items: [
			{ alias: "ASA", songId: "000AinSophAur.Yumeji.0" },
			{ alias: "ASA", songId: "000AinSophAur.Yumeji.0" },
		],
	},
};

test("live resolve caches hits for 6 h, keyed on trim + lowercase", async () => {
	const { seen, clock } = resolveDeps(async () => RESOLVE_ASA);
	assert.deepEqual(await resolveAliasLive("ASA"), {
		status: "hit",
		ids: ["000AinSophAur.Yumeji.0"],
	});
	assert.equal((await resolveAliasLive(" asa ")).status, "hit");
	assert.deepEqual(seen, ["ASA"]);
	clock.now += 6 * 60 * 60 * 1000 - 1;
	await resolveAliasLive("asa");
	assert.equal(seen.length, 1);
	clock.now += 2;
	await resolveAliasLive("asa");
	assert.deepEqual(seen, ["ASA", "asa"]);
});

test("live resolve does not fold full-width input the way upstream does not", async () => {
	const { seen } = resolveDeps(async () => ({
		status: 200,
		body: { items: [] },
	}));
	assert.notEqual(liveAliasKey("ＡＳＡ"), liveAliasKey("ASA"));
	await resolveAliasLive("ＡＳＡ");
	await resolveAliasLive("ASA");
	assert.deepEqual(seen, ["ＡＳＡ", "ASA"]);
});

test("live resolve caches misses 15 min and errors 60 s", async () => {
	let reply: { status: number; body: unknown } | Error = {
		status: 200,
		body: { items: [] },
	};
	const { seen, clock } = resolveDeps(async () => {
		if (reply instanceof Error) throw reply;
		return reply;
	});
	assert.deepEqual(await resolveAliasLive("鸽游"), { status: "miss", ids: [] });
	clock.now += 15 * 60 * 1000 - 1;
	await resolveAliasLive("鸽游");
	assert.equal(seen.length, 1);

	reply = new Error("socket hang up");
	assert.equal((await resolveAliasLive("雨晴")).status, "error");
	clock.now += 59_000;
	assert.equal((await resolveAliasLive("雨晴")).status, "error");
	assert.equal(seen.length, 2);
	reply = { status: 502, body: { error: "upstream" } };
	clock.now += 2_000;
	assert.equal((await resolveAliasLive("雨晴")).status, "error");
	assert.equal(seen.length, 3);
});

test("a Worker without the alias route turns live resolve off for a while", async () => {
	const { seen, clock } = resolveDeps(async () => ({
		status: 404,
		body: undefined,
	}));
	assert.equal((await resolveAliasLive("a")).status, "off");
	assert.equal((await resolveAliasLive("b")).status, "off");
	assert.deepEqual(seen, ["a"]);
	clock.now += 15 * 60 * 1000;
	await resolveAliasLive("b");
	assert.deepEqual(seen, ["a", "b"]);
});

test("upstream failures in a row open a one-minute breaker", async () => {
	const { seen, clock } = resolveDeps(async () => ({
		status: 502,
		body: undefined,
	}));
	for (const q of ["e1", "e2", "e3"]) {
		assert.equal((await resolveAliasLive(q)).status, "error");
	}
	assert.equal((await resolveAliasLive("e4")).status, "off");
	assert.deepEqual(seen, ["e1", "e2", "e3"]);
	clock.now += 60_000;
	assert.equal((await resolveAliasLive("e4")).status, "error");
	assert.deepEqual(seen, ["e1", "e2", "e3", "e4"]);
});

test("one client cannot spend the whole live budget", async () => {
	const { seen } = resolveDeps(async () => ({
		status: 200,
		body: { items: [] },
	}));
	const statuses: string[] = [];
	for (let i = 0; i < 12; i++) {
		statuses.push((await resolveAliasLive(`q${i}`, "203.0.113.7")).status);
	}
	assert.equal(seen.length, 10);
	assert.deepEqual(statuses.slice(10), ["skipped", "skipped"]);
	assert.equal((await resolveAliasLive("q0", "203.0.113.7")).status, "miss");
	for (let i = 0; i < 25; i++)
		await resolveAliasLive(`p${i}`, `198.51.100.${i}`);
	// 30 per minute across all clients
	assert.equal(seen.length, 30);
});

test("live resolve is single-flight and fills the cache after a timeout", async () => {
	const slow = deferred<{ status: number; body: unknown }>();
	const { seen } = resolveDeps(() => slow.promise);
	const [a, b] = await Promise.all([
		resolveAliasLive("ASA"),
		resolveAliasLive("asa"),
	]);
	assert.equal(a.status, "timeout");
	assert.equal(b.status, "timeout");
	assert.equal(seen.length, 1);
	slow.resolve(RESOLVE_ASA);
	await new Promise((r) => setImmediate(r));
	assert.equal((await resolveAliasLive("ASA")).status, "hit");
	assert.equal(seen.length, 1);
});

test("live resolve skips empty or over-long input", async () => {
	const { seen } = resolveDeps(async () => RESOLVE_ASA);
	assert.equal((await resolveAliasLive("  ")).status, "skipped");
	assert.equal((await resolveAliasLive("x".repeat(65))).status, "skipped");
	assert.deepEqual(seen, []);
});
