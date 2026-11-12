import assert from "node:assert/strict";
import test from "node:test";
import {
	type RefreshRecord,
	type RefreshSide,
	refreshSummary,
} from "./refresh-summary";

function rec(
	id: string,
	score: number,
	acc: number,
	fc = false,
	rank = "IN",
): RefreshRecord {
	return { id, rank, acc, score, fc };
}

function side(
	rev: string,
	records: RefreshRecord[],
	rks: number | null = 15,
): RefreshSide {
	return { rev, rks, records };
}

test("no earlier save gives no summary", () => {
	assert.equal(refreshSummary(null, side("a", [rec("A.0", 900000, 95)])), null);
});

test("the same upload is reported as the same save", () => {
	const before = side("cdn/a.zip|1", [rec("A.0", 900000, 95)]);
	const after = side("cdn/a.zip|1", [
		rec("A.0", 950000, 97),
		rec("B.0", 800000, 90),
	]);
	assert.deepEqual(refreshSummary(before, after), { kind: "same" });
});

test("an empty revision never counts as the same save", () => {
	const before = side("", [rec("A.0", 900000, 95)]);
	const after = side("", [rec("A.0", 950000, 97)]);
	assert.equal(refreshSummary(before, after)?.kind, "changed");
});

test("a higher score, a higher accuracy or a new full combo each count once", () => {
	const before = side("r1", [
		rec("A.0", 900000, 95),
		rec("B.0", 900000, 95),
		rec("C.0", 900000, 95),
		rec("D.0", 900000, 95),
	]);
	const after = side("r2", [
		rec("A.0", 910000, 95),
		rec("B.0", 900000, 95.5),
		rec("C.0", 900000, 95, true),
		rec("D.0", 900000, 95),
	]);
	const out = refreshSummary(before, after);
	assert.ok(out?.kind === "changed");
	assert.equal(out.charts, 3);
	assert.equal(out.fc, 1);
	assert.equal(out.ap, 0);
});

test("a chart played for the first time counts as a new best", () => {
	const before = side("r1", [rec("A.0", 900000, 95)]);
	const after = side("r2", [
		rec("A.0", 900000, 95),
		rec("A.0", 700000, 80, false, "AT"),
	]);
	const out = refreshSummary(before, after);
	assert.ok(out?.kind === "changed");
	assert.equal(out.charts, 1);
	assert.equal(out.fc, 0);
	assert.equal(out.ap, 0);
});

test("a new AP on a chart that was not a full combo counts as both", () => {
	const before = side("r1", [rec("A.0", 990000, 99.5)]);
	const after = side("r2", [rec("A.0", 1000000, 100, true)]);
	const out = refreshSummary(before, after);
	assert.ok(out?.kind === "changed");
	assert.equal(out.charts, 1);
	assert.equal(out.fc, 1);
	assert.equal(out.ap, 1);
});

test("an AP that was already there is not new", () => {
	const before = side("r1", [rec("A.0", 1000000, 100, true)]);
	const after = side("r2", [rec("A.0", 1000000, 100, true)]);
	const out = refreshSummary(before, after);
	assert.ok(out?.kind === "changed");
	assert.equal(out.ap, 0);
	assert.equal(out.charts, 0);
});

test("RKS before and after are passed through", () => {
	const out = refreshSummary(side("r1", [], 15.1), side("r2", [], 15.2));
	assert.ok(out?.kind === "changed");
	assert.deepEqual(out.rks, [15.1, 15.2]);
	const missing = refreshSummary(side("r1", [], null), side("r2", [], 15.2));
	assert.ok(missing?.kind === "changed");
	assert.deepEqual(missing.rks, [null, 15.2]);
});
