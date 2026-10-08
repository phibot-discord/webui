import assert from "node:assert/strict";
import test from "node:test";
import type { AliasEntry, AliasIndex } from "@/server/aliases";
import type { ChartSummary } from "@/server/charts";
import {
	parseSongSearch,
	type SongSearchBody,
	type SongSearchDeps,
	songSearchResponse,
} from "./search";

const LIST: ChartSummary[] = [
	{
		id: "AbsoluTedisoRdeR.AcuteDisarray.0",
		song: "AbsoluTe disoRdeR",
		composer: "Acute Disarray",
		aliases: ["Ad"],
		charts: { IN: [14.6, 1000] },
	},
	{
		id: "Adastraperaspera.RabbitHouse.0",
		song: "Ad astra per aspera",
		composer: "Rabbit House",
		aliases: ["Ad"],
		charts: { EZ: [3.5, 412] },
	},
	{
		id: "AfterDawn.S9ryne.0",
		song: "After Dawn",
		composer: "S9ryne",
		aliases: ["AD"],
		charts: { AT: [16.2, null] },
	},
	{
		id: "Igallta.SeURa.0",
		song: "Igallta",
		composer: "Se-U-Ra",
		charts: { AT: [16.4, 1500] },
	},
];

function index(over: Partial<AliasIndex> = {}): AliasIndex {
	const byId = new Map<string, AliasEntry[]>([
		["Adastraperaspera.RabbitHouse.0", [{ text: "Ad", layer: "approved" }]],
	]);
	return {
		rev: "cat|sha",
		byId,
		approvedSha: "sha",
		stale: false,
		...over,
	};
}

function deps(over: Partial<SongSearchDeps> = {}, aliases = index()) {
	const live: string[] = [];
	const d: SongSearchDeps = {
		catalog: async () => ({ list: LIST, aliases }),
		live: async (q) => {
			live.push(q);
			return { status: "miss", ids: [] };
		},
		...over,
	};
	return { d, live };
}

function get(qs: string, headers: Record<string, string> = {}) {
	return new Request(`http://local/api/songs/search?${qs}`, { headers });
}

test("parseSongSearch validates q, limit and exact", () => {
	const p = (qs: string) => parseSongSearch(new URLSearchParams(qs));
	assert.deepEqual(p("q=%20ad%20"), { q: "ad", limit: 10, exact: false });
	assert.deepEqual(p("q=ad&limit=25&exact=1"), {
		q: "ad",
		limit: 25,
		exact: true,
	});
	for (const bad of [
		"",
		"q=",
		"q=%20%20",
		`q=${"x".repeat(65)}`,
		"q=a&limit=0",
		"q=a&limit=26",
		"q=a&limit=2.5",
		"q=a&limit=-1",
		"q=a&exact=yes",
	]) {
		assert.ok("error" in p(bad), bad);
	}
	assert.equal("error" in p(`q=${"x".repeat(64)}`), false);
});

test("bad input is a 400 that caches never store", async () => {
	const { d } = deps();
	for (const qs of ["", `q=${"x".repeat(65)}`, "q=a&limit=99"]) {
		const res = await songSearchResponse(get(qs), d);
		assert.equal(res.status, 400);
		assert.equal(res.headers.get("cache-control"), "no-store");
	}
});

test("results carry the matched alias, layers and charts; ETag gives 304", async () => {
	const { d, live } = deps();
	const res = await songSearchResponse(get("q=ad&limit=2"), d);
	assert.equal(res.status, 200);
	assert.equal(
		res.headers.get("cache-control"),
		"public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
	);
	const body = (await res.json()) as SongSearchBody;
	assert.equal(body.live, "skipped");
	assert.deepEqual(live, []);
	assert.equal(body.results.length, 2);
	assert.deepEqual(body.results[1], {
		id: "Adastraperaspera.RabbitHouse.0",
		song: "Ad astra per aspera",
		composer: "Rabbit House",
		match: { tier: "exact", kind: "alias", text: "Ad", score: 1 },
		aliases: [{ text: "Ad", layer: "approved" }],
		charts: { EZ: [3.5, 412] },
	});

	const etag = res.headers.get("etag");
	assert.match(etag ?? "", /^"songs-[0-9a-f]{16}"$/);
	const again = await songSearchResponse(
		get("q=ad&limit=2", { "if-none-match": etag ?? "" }),
		d,
	);
	assert.equal(again.status, 304);
	assert.equal(await again.text(), "");
	const other = await songSearchResponse(
		get("q=ad&limit=3", { "if-none-match": etag ?? "" }),
		d,
	);
	assert.equal(other.status, 200);
});

test("exact=1 keeps exact hits only", async () => {
	const { d } = deps();
	const res = await songSearchResponse(get("q=igall&exact=1"), d);
	const body = (await res.json()) as SongSearchBody;
	assert.deepEqual(body.results, []);
});

test("live resolve runs only without an exact hit while the approved layer is stale", async () => {
	const fresh = deps();
	await songSearchResponse(get("q=igall"), fresh.d);
	assert.deepEqual(fresh.live, []);

	const never = deps({}, index({ approvedSha: undefined, rev: "cat|base" }));
	const res = await songSearchResponse(get("q=igall"), never.d);
	assert.equal(((await res.json()) as SongSearchBody).live, "skipped");
	assert.deepEqual(never.live, []);

	const stale = deps({}, index({ approvedSha: undefined, stale: true }));
	await songSearchResponse(get("q=ad"), stale.d);
	assert.deepEqual(stale.live, []);
	await songSearchResponse(get("q=igall"), stale.d);
	assert.deepEqual(stale.live, ["igall"]);
});

test("the live lookup is told which client asked", async () => {
	const clients: (string | undefined)[] = [];
	const { d } = deps(
		{
			live: async (_q, client) => {
				clients.push(client);
				return { status: "miss", ids: [] };
			},
		},
		index({ stale: true }),
	);
	await songSearchResponse(
		get("q=igall", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
		d,
	);
	assert.deepEqual(clients, ["203.0.113.7"]);
});

test("a live hit is listed first; a timeout shortens caching", async () => {
	const hit = deps(
		{ live: async () => ({ status: "hit", ids: ["Igallta.SeURa.0"] }) },
		index({ stale: true }),
	);
	const res = await songSearchResponse(
		get("q=%E6%96%B0%E5%88%AB%E5%90%8D"),
		hit.d,
	);
	const body = (await res.json()) as SongSearchBody;
	assert.equal(body.live, "hit");
	assert.equal(body.stale, true);
	assert.deepEqual(body.results[0]?.match, {
		tier: "exact",
		kind: "alias",
		text: "新别名",
		score: 1,
		live: true,
	});
	assert.equal(
		res.headers.get("cache-control"),
		"public, max-age=0, s-maxage=15, stale-while-revalidate=60",
	);

	const slow = deps(
		{ live: async () => ({ status: "timeout", ids: [] }) },
		index({ approvedSha: undefined, stale: true }),
	);
	const timedOut = await songSearchResponse(get("q=igall"), slow.d);
	const tb = (await timedOut.json()) as SongSearchBody;
	assert.equal(tb.live, "timeout");
	assert.equal(tb.results[0]?.id, "Igallta.SeURa.0");
	assert.equal(
		timedOut.headers.get("cache-control"),
		"public, max-age=0, s-maxage=15, stale-while-revalidate=60",
	);
});
