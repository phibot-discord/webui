import assert from "node:assert/strict";
import test from "node:test";
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatalogProvider } from "@/i18n/catalog-context";
import { en } from "@/i18n/messages";
import { zh } from "@/i18n/zh-messages";
import type { SongTagList, SongTagRow } from "@/server/song-tags";
import { SongTags } from "./SongTags";

function row(id: number, name: string, share: number, votes: number) {
	const out: SongTagRow = { id, name, category: "Stamina", share, votes };
	return out;
}

const HD: SongTagList = { total: 4, tags: [row(2, "Flash", 1, 4)] };
const IN: SongTagList = {
	total: 20,
	tags: [row(4, "Long jacks", 0.35, 7), row(1, "Mixed speed", 0.3, 6)],
};

function render(
	props: ComponentProps<typeof SongTags>,
	locale: "en" | "zh" = "en",
) {
	const provider: ComponentProps<typeof CatalogProvider> = {
		locale,
		messages: locale === "en" ? en : zh,
		setLocale: () => {},
		children: null,
	};
	return renderToStaticMarkup(
		createElement(
			AppRouterContext.Provider,
			{ value: {} as AppRouterInstance },
			createElement(CatalogProvider, provider, createElement(SongTags, props)),
		),
	);
}

function radios(html: string) {
	return [...html.matchAll(/<input [^>]*type="radio"[^>]*>/g)].map((m) => ({
		value: m[0].match(/value="([^"]+)"/)?.[1],
		checked: m[0].includes('checked=""'),
	}));
}

function rows(html: string) {
	const body = html.match(/<tbody>(.*)<\/tbody>/)?.[1] ?? "";
	return [...body.matchAll(/<tr>(.*?)<\/tr>/g)].map((m) => {
		const cells = m[1] ?? "";
		return {
			href: cells.match(/href="([^"]+)"/)?.[1],
			name: cells.match(/<a [^>]*>([^<]+)<\/a>/)?.[1],
			bar: cells.match(/<span [^>]*aria-hidden="true"[^>]*>/)?.[0] ?? "",
			text: cells.replace(/<[^>]+>/g, "|"),
		};
	});
}

test("the picker starts on the top level and offers only the levels with tags", () => {
	const html = render({ lists: { HD, IN }, top: "IN" });
	assert.deepEqual(radios(html), [
		{ value: "HD", checked: false },
		{ value: "IN", checked: true },
	]);
	const got = rows(html);
	assert.deepEqual(
		got.map((r) => [r.href, r.name]),
		[
			["/charts?tag=4", "Long jacks"],
			["/charts?tag=1", "Mixed speed"],
		],
	);
	assert.match(got[0]?.text ?? "", /\|Stamina\|/);
	assert.match(got[0]?.text ?? "", /\|35%\|/);
	assert.match(got[0]?.text ?? "", /\|7\|/);
	assert.match(got[0]?.bar ?? "", /style="--share:0.35"/);
	assert.match(html, /<h2 [^>]*>Chart tags<\/h2>/);
});

test("without tags on the top level the picker starts on the highest level that has them", () => {
	const html = render({ lists: { HD, IN }, top: "AT" });
	assert.deepEqual(
		radios(html).find((r) => r.checked),
		{ value: "IN", checked: true },
	);
	assert.deepEqual(
		rows(html).map((r) => r.name),
		["Long jacks", "Mixed speed"],
	);
	const lower = render({ lists: { HD }, top: "IN" });
	assert.deepEqual(radios(lower), []);
	assert.deepEqual(
		rows(lower).map((r) => r.name),
		["Flash"],
	);
});

test("under the list come the level's vote total, the vote date and the glossary link", () => {
	const html = render({ lists: { IN }, top: "AT", date: "Nov 10, 2026" });
	assert.deepEqual(radios(html), []);
	assert.match(html, /20 votes on the IN chart\./);
	assert.match(html, /Votes from kyou\.net\.cn, copied Nov 10, 2026\./);
	assert.match(html, /<a [^>]*href="\/tags"[^>]*>What the tags mean<\/a>/);
	assert.doesNotMatch(render({ lists: { IN }, top: "IN" }), /copied/);
});

test("links keep the page language", () => {
	const html = render({ lists: { IN }, top: "IN" }, "zh");
	assert.match(html, /href="\/zh\/charts\?tag=4"/);
	assert.match(html, /href="\/zh\/tags"/);
	assert.match(html, /<h2 [^>]*>谱面标签<\/h2>/);
});
