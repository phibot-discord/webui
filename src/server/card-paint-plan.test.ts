import assert from "node:assert/strict";
import test from "node:test";
import { dataTimeoutMs, heightInputs, paintTimeoutMs } from "./card-paint-plan";

test("the data phase leaves room for the paint", () => {
	assert.equal(dataTimeoutMs(0), 65_000);
	assert.equal(dataTimeoutMs(30_000), 35_000);
	assert.equal(dataTimeoutMs(80_000), 1_000);
});

test("a paint gets what is left of the request, at most 45 s", () => {
	assert.equal(paintTimeoutMs(0), 45_000);
	assert.equal(paintTimeoutMs(60_000), 25_000);
	assert.equal(paintTimeoutMs(81_000), undefined);
});

test("a partial render neither uses nor records a height", () => {
	assert.deepEqual(heightInputs(true, "h", 900), {});
	assert.deepEqual(heightInputs(false, "h", 900), {
		heightKey: "h",
		height: 900,
	});
	assert.deepEqual(heightInputs(false, "h", undefined), {
		heightKey: "h",
		height: undefined,
	});
});
