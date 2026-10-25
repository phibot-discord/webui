import assert from "node:assert/strict";
import test from "node:test";
import { parseCollectionLang } from "./collection";
import {
	collectionHref,
	NAV_VIEWS,
	navView,
	parseParam,
	parseTimelineTab,
	parseView,
	pvHref,
	textsHref,
	timelineHref,
	viewHref,
} from "./files-view";

test("an unknown or missing view is the file list", () => {
	assert.equal(parseView(undefined), "files");
	assert.equal(parseView("nope"), "files");
	assert.equal(parseView(""), "files");
	assert.equal(parseView("pv"), "pv");
	assert.equal(parseView("collection"), "collection");
	assert.equal(parseView("c9s6"), "c9s6");
	assert.equal(parseView("C9S6"), "files");
	assert.equal(parseView(["pv", "collection"]), "pv");
	assert.equal(parseView([]), "files");
});

test("the hidden song page is reached from the collection, not from the view tabs", () => {
	assert.deepEqual(NAV_VIEWS, [
		"files",
		"pv",
		"collection",
		"timeline",
		"texts",
	]);
	assert.equal(navView("timeline"), "timeline");
	assert.equal(navView("c9s6"), "collection");
	assert.equal(navView("texts"), "texts");
	assert.equal(navView("collection"), "collection");
	assert.equal(navView("pv"), "pv");
	assert.equal(navView("files"), "files");
});

test("a parameter is trimmed, capped and may be absent", () => {
	assert.equal(parseParam(undefined), undefined);
	assert.equal(parseParam("  "), undefined);
	assert.equal(parseParam(" c1 "), "c1");
	assert.equal(parseParam(["a", "b"]), "a");
	assert.equal(parseParam("x".repeat(200))?.length, 80);
});

test("each view has one address, and ids are escaped in it", () => {
	assert.equal(viewHref("files"), "/files");
	assert.equal(viewHref("pv"), "/files?view=pv");
	assert.equal(viewHref("collection"), "/files?view=collection");
	assert.equal(viewHref("c9s6"), "/files?view=c9s6");
	assert.equal(viewHref("timeline"), "/files?view=timeline");
	assert.equal(parseView("timeline"), "timeline");
	assert.equal(pvHref("iga-main"), "/files?view=pv&v=iga-main");
	assert.equal(pvHref("a b&c"), "/files?view=pv&v=a%20b%26c");
	assert.equal(collectionHref("c1"), "/files?view=collection&chapter=c1");
	assert.equal(collectionHref("a&b"), "/files?view=collection&chapter=a%26b");
});

test("a Game text section link carries the picked language", () => {
	assert.equal(textsHref("tips"), "/files?view=texts&section=tips");
	assert.equal(
		textsHref("tips", "ko"),
		"/files?view=texts&section=tips&lang=ko",
	);
	assert.equal(
		textsHref("story", undefined, "t-qd"),
		"/files?view=texts&section=story#t-qd",
	);
	assert.equal(parseView("texts"), "texts");
});

test("a picked Collection language rides along on chapter links", () => {
	assert.equal(
		collectionHref("c9", "ja"),
		"/files?view=collection&chapter=c9&lang=ja",
	);
	assert.equal(collectionHref("c9"), "/files?view=collection&chapter=c9");
	assert.equal(parseCollectionLang("zh-TW"), "zh-TW");
	assert.equal(parseCollectionLang("fr"), undefined);
	assert.equal(parseCollectionLang(undefined), undefined);
});

test("a timeline link keeps its thread and the community switch", () => {
	assert.equal(timelineHref(), "/files?view=timeline");
	assert.equal(
		timelineHref({ thread: "sultan" }),
		"/files?view=timeline&thread=sultan",
	);
	assert.equal(
		timelineHref({ thread: "a b", community: true }, "era-x"),
		"/files?view=timeline&thread=a+b&community=1#era-x",
	);
	assert.equal(
		timelineHref({ tab: "setting", community: true }, "t-haven"),
		"/files?view=timeline&tab=setting&community=1#t-haven",
	);
	assert.equal(timelineHref({ tab: "timeline" }), "/files?view=timeline");
	assert.equal(
		timelineHref({ tab: "setting", kind: "place" }, "t-haven"),
		"/files?view=timeline&tab=setting&kind=place#t-haven",
	);
	assert.equal(
		timelineHref({ tab: "eras", kind: "place" }),
		"/files?view=timeline&tab=eras",
	);
	assert.equal(
		timelineHref({ tab: "setting", kind: "person", page: 2 }),
		"/files?view=timeline&tab=setting&kind=person&p=3",
	);
	assert.equal(
		timelineHref({ tab: "setting", kind: "person", page: 0 }),
		"/files?view=timeline&tab=setting&kind=person",
	);
	assert.equal(parseTimelineTab("eras"), "eras");
	assert.equal(parseTimelineTab("nope"), "timeline");
	assert.equal(parseTimelineTab(undefined), "timeline");
});
