import assert from "node:assert/strict";
import test from "node:test";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/i18n/datetime";
import { parseTagVotes } from "@/phi/lib/chart-tag-votes";
import { browseView } from "./chart-browse";
import type { ChartSummary } from "./charts";
import { songTags } from "./song-tags";

const FETCHED = "2026-11-10T09:00:00.000Z";

function votesOf(sha: string, fetchedAt?: string) {
	return parseTagVotes({
		sha,
		...(fetchedAt ? { fetchedAt } : {}),
		tree: [
			{
				id: 152,
				name: "读谱",
				children: [
					{ id: 1, name: "差速" },
					{ id: 2, name: "变速/闪现" },
				],
			},
			{
				id: 153,
				name: "硬抗",
				children: [
					{ id: 3, name: "面海" },
					{ id: 4, name: "长纵连" },
				],
			},
		],
		charts: {
			"Alpha.Composer": {
				votes: {
					HD: { "2": 30, "1": 1 },
					IN: { "1": 6, "2": 1, "3": 6, "4": 7 },
					AT: { "3": 2 },
				},
			},
			"Beta.Composer": { votes: { EZ: { "4": 3 } } },
		},
	});
}

const ALPHA = {
	id: "Alpha.Composer.0",
	levels: [{ rank: "EZ" }, { rank: "HD" }, { rank: "IN" }, { rank: "AT" }],
};

test("a level lists the tags with at least 5% of its votes, strongest first, then by tag id", () => {
	const got = songTags(ALPHA, votesOf("order", FETCHED), "en");
	const list = got.lists.IN;
	assert.ok(list);
	assert.equal(list.total, 20);
	assert.deepEqual(
		list.tags.map((t) => [t.id, t.votes, t.share]),
		[
			[4, 7, 0.35],
			[1, 6, 0.3],
			[3, 6, 0.3],
			[2, 1, 0.05],
		],
	);
});

test("a tag under 5% of the votes is left out, but its votes still count in the total", () => {
	const list = songTags(ALPHA, votesOf("share", FETCHED), "en").lists.HD;
	assert.ok(list);
	assert.equal(list.total, 31);
	assert.deepEqual(
		list.tags.map((t) => [t.id, t.votes]),
		[[2, 30]],
	);
	assert.equal(list.tags[0]?.share, 30 / 31);
});

test("a level with fewer than 3 votes, or with none, is not offered", () => {
	const got = songTags(ALPHA, votesOf("few", FETCHED), "en");
	assert.deepEqual(Object.keys(got.lists), ["HD", "IN"]);
});

test("tag and category names follow the page language", () => {
	const names = (locale: Locale) => {
		const top = songTags(ALPHA, votesOf(`names-${locale}`), locale).lists.IN
			?.tags[0];
		return [top?.name, top?.category];
	};
	assert.deepEqual(names("en"), ["Long jacks", "Stamina"]);
	assert.deepEqual(names("zh"), ["长纵连", "硬抗"]);
	assert.deepEqual(names("ja"), ["長い縦連", "体力"]);
});

test("the vote date is written for the page language, and left out when the file has none", () => {
	for (const locale of ["en", "zh", "ja"] as const) {
		const got = songTags(ALPHA, votesOf(`date-${locale}`, FETCHED), locale);
		assert.equal(got.date, formatDateTime(FETCHED, locale));
		assert.match(got.date ?? "", /2026/);
	}
	assert.equal(songTags(ALPHA, votesOf("no-date"), "en").date, undefined);
});

test("a song without votes, or a page without the vote file, gets no lists", () => {
	const none = songTags(
		{ id: "Gamma.Composer.0", levels: [{ rank: "IN" }] },
		votesOf("none", FETCHED),
		"en",
	);
	assert.deepEqual(none.lists, {});
	assert.deepEqual(songTags(ALPHA, undefined, "en"), { lists: {} });
});

test("the song page lists exactly the tags the chart browser lists for each chart", () => {
	const list: ChartSummary[] = [
		{
			id: "Alpha.Composer.0",
			song: "Alpha",
			composer: "Composer",
			charts: {
				EZ: [3, 300],
				HD: [7.5, 500],
				IN: [12.8, 900],
				AT: [15.9, 1200],
			},
		},
		{
			id: "Beta.Composer.0",
			song: "Beta",
			composer: "Composer",
			charts: { EZ: [2.5, 200], IN: [11.2, 700] },
		},
	];
	let tagged = 0;
	for (const locale of ["en", "zh", "ja"] as const) {
		const votes = votesOf(`browse-${locale}`, FETCHED);
		const view = browseView(list, votes, locale);
		const named = new Map(view.tags.map((t) => [t.id, t] as const));
		assert.equal(view.charts.length, 6);
		for (const chart of view.charts) {
			const id = view.songs[chart[0]]?.id ?? "";
			const rank = chart[1];
			const rows = songTags({ id, levels: [{ rank }] }, votes, locale).lists[
				rank
			]?.tags;
			assert.deepEqual(rows?.map((t) => t.id) ?? [], chart[9], `${id} ${rank}`);
			for (const row of rows ?? []) {
				assert.equal(row.name, named.get(row.id)?.name);
				assert.equal(row.category, named.get(row.id)?.cat);
			}
			if (rows?.length) tagged++;
		}
	}
	assert.equal(tagged, 9);
});
