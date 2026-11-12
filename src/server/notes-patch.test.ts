import assert from "node:assert/strict";
import test from "node:test";
import { parseNotesPatch } from "./notes-patch";

const knownBackground = (id: string) =>
	id === "Song.A" ? "Song.A" : undefined;

test("every valid field lands in one patch", () => {
	const body = {
		showTagAnalysis: false,
		showRecordStats: true,
		stddevExcludeP3: true,
		cardQuality: "high",
		cardBackground: "Song.A",
		cardStyle: { kind: "b30", style: "table" },
		b30AvgKind: "rank",
		rankScope: "band",
		rankBandShow: "percent",
		peerWait: true,
	};
	const parsed = parseNotesPatch(body, knownBackground);
	assert.ok("patch" in parsed);
	assert.deepEqual(parsed.patch, body);
	assert.deepEqual(parsed.reply, { ok: true, ...body });
});

test("an unknown background rejects the whole body", () => {
	assert.deepEqual(
		parseNotesPatch(
			{ showTagAnalysis: false, cardBackground: "nope" },
			knownBackground,
		),
		{ error: "bad_request" },
	);
});

test("an invalid card style rejects the whole body", () => {
	assert.deepEqual(
		parseNotesPatch(
			{ peerWait: true, cardStyle: { kind: "b30", style: "nope" } },
			knownBackground,
		),
		{ error: "bad_request" },
	);
});

test("an invalid rank option rejects the whole body", () => {
	assert.deepEqual(
		parseNotesPatch({ showRecordStats: true, rankScope: "x" }, knownBackground),
		{ error: "bad_request" },
	);
});

test("values of the wrong type are ignored", () => {
	const parsed = parseNotesPatch(
		{ showTagAnalysis: "yes", cardQuality: "ultra", peerWait: true },
		knownBackground,
	);
	assert.ok("patch" in parsed);
	assert.deepEqual(parsed.patch, { peerWait: true });
	assert.deepEqual(parsed.reply, { ok: true, peerWait: true });
});

test("an empty background clears it", () => {
	const parsed = parseNotesPatch({ cardBackground: "" }, knownBackground);
	assert.ok("patch" in parsed);
	assert.deepEqual(parsed.patch, { cardBackground: "" });
	assert.deepEqual(parsed.reply, { ok: true, cardBackground: "" });
});

test("fields only the Discord bot sets are not accepted from the browser", () => {
	const botFields = {
		theme: "snow",
		b30AvgColor: "red",
		allowApiUsage: false,
		showB30Analysis: false,
	};
	assert.deepEqual(parseNotesPatch(botFields, knownBackground), {
		error: "bad_request",
	});
	const parsed = parseNotesPatch(
		{ ...botFields, peerWait: true },
		knownBackground,
	);
	assert.ok("patch" in parsed);
	assert.deepEqual(parsed.patch, { peerWait: true });
	assert.deepEqual(parsed.reply, { ok: true, peerWait: true });
});

test("a body with nothing to apply is rejected", () => {
	for (const body of [{}, null, "x", { showTagAnalysis: "yes" }]) {
		assert.deepEqual(parseNotesPatch(body, knownBackground), {
			error: "bad_request",
		});
	}
});
