import assert from "node:assert/strict";
import test from "node:test";
import {
	localizeChartTagDescription,
	localizeChartTagName,
	resolvePhiLocale,
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
