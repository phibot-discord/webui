import assert from "node:assert/strict";
import test from "node:test";
import {
	cardCopy,
	localizeChartTagDescription,
	localizeChartTagLabels,
	localizeChartTagName,
	resolvePhiLocale,
	tagAnalysisMeta,
	tagPoolNote,
} from "./card-i18n";

test("card render locale prefers the request over stored notes", () => {
	assert.equal(resolvePhiLocale("en", "zh"), "en");
	assert.equal(resolvePhiLocale("zh", "en"), "zh");
	assert.equal(resolvePhiLocale(undefined, "zh"), "zh");
	assert.equal(resolvePhiLocale("en", undefined), "en");
});

test("chart tag glossary localizes names and official descriptions", () => {
	assert.equal(localizeChartTagName("差速", "en"), "Mixed speed");
	assert.equal(
		localizeChartTagDescription("差速", "同一时刻的Note的下落速度不同", "en"),
		"Notes at the same time drop at different speeds (e.g. Temporal Shifting)",
	);
	assert.equal(
		localizeChartTagDescription("差速", "同一时刻的Note的下落速度不同", "zh"),
		"同一时刻的Note的下落速度不同",
	);
	assert.equal(localizeChartTagDescription("慢流速", "", "en"), "");
});

test("tag meta line names the constant range, scores and votes", () => {
	const zh = cardCopy("zh");
	const en = cardCopy("en");
	const pool = {
		range: { min: 15.2, max: 18.2 },
		recordCount: 120,
		totalVotes: 2499,
	};
	assert.equal(
		tagAnalysisMeta(pool, zh),
		"定数 15.2–18.2 · 成绩 120 · 选票 2499",
	);
	assert.equal(
		tagAnalysisMeta(pool, en),
		"Constants 15.2–18.2 · Scores 120 · Votes 2499",
	);
	assert.equal(
		tagAnalysisMeta({ ...pool, range: { min: 15, max: 18 } }, zh),
		"定数 15.0–18.0 · 成绩 120 · 选票 2499",
	);
	assert.equal(tagAnalysisMeta({ totalVotes: 12 }, zh), "有效票 12");
	assert.equal(tagAnalysisMeta({ totalVotes: 12 }, en), "Valid votes 12");
	assert.equal(tagAnalysisMeta(null, zh), "暂无数据");
	assert.equal(tagAnalysisMeta(undefined, en), "No data");
});

test("tag pool note names the baseline the +/- compares with", () => {
	const pool = {
		range: { min: 15.2, max: 18.2 },
		recordCount: 120,
		totalVotes: 2499,
	};
	assert.equal(
		tagPoolNote(pool, cardCopy("zh")),
		"+/- 为准确率损失与你其他谱面的预期相比（+0.30 = 少一半），定数 15.2–18.2",
	);
	assert.match(
		tagPoolNote(pool, cardCopy("en")),
		/^\+\/- is lost acc vs what your other charts predict \(\+0\.30 = half as much\), 15\.2–18\.2\.$/,
	);
	assert.match(
		tagPoolNote({ ...pool, basis: "aps" }, cardCopy("en")),
		/^All 99\.9%\+, so there is no gap to measure: .*15\.2–18\.2\.$/,
	);
	assert.equal(
		tagPoolNote(
			{ ...pool, basis: "history", asOf: "2026-10-10T17:00:00.000Z" },
			cardCopy("en"),
		),
		"All 99.9%+ now: from your scores on 2026-10-11 (+0.30 = half as much lost), 15.2–18.2.",
	);
	assert.equal(tagPoolNote({ totalVotes: 3 }, cardCopy("en")), "");
	assert.equal(tagPoolNote(null, cardCopy("zh")), "");
});

test("tag panel points voters at kyou.net.cn", () => {
	const zh = cardCopy("zh");
	const en = cardCopy("en");
	assert.equal(zh.tagAbility, "谱面实力分析");
	assert.equal(zh.tagTip, "谱面投票可前往 https://kyou.net.cn/phigros 提交");
	for (const copy of [zh, en]) {
		for (const text of [copy.tagInsufficient, copy.tagTip]) {
			assert.match(text, /https:\/\/kyou\.net\.cn\/phigros/);
			assert.doesNotMatch(text, /phib19|settag/);
		}
		assert.notEqual(copy.tagUnavailable, copy.tagInsufficient);
	}
});

test("localized tag labels keep the pool fields", () => {
	const out = localizeChartTagLabels(
		{
			range: { min: 15.2, max: 18.2 },
			recordCount: 20,
			categories: [{ name: "读谱" }],
			radar: { categories: [{ name: "多指" }] },
			strong: [{ name: "差速" }],
			weak: [],
		},
		"en",
	);
	assert.deepEqual(out.range, { min: 15.2, max: 18.2 });
	assert.equal(out.recordCount, 20);
	assert.equal(out.categories[0]?.name, "Reading");
	assert.equal(out.strong[0]?.name, "Mixed speed");
});

test("the classic card's mode chips are the short card titles", () => {
	const zh = cardCopy("zh");
	const en = cardCopy("en");
	assert.equal(zh.x30Mode, "性30");
	assert.equal(zh.fcMode, "FC30");
	assert.equal(en.x30Mode, "x30");
	assert.equal(en.fcMode, "FC30");
	assert.equal(zh.apMode, "All Perfect 模式");
});
