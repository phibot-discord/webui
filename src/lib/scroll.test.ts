import assert from "node:assert/strict";
import test from "node:test";
import { revealDelta, rowFade } from "./scroll";

const box = { top: 100, bottom: 500 };

test("a target already in view does not move the panel", () => {
	assert.equal(revealDelta(box, { top: 200, bottom: 230 }), 0);
	assert.equal(revealDelta(box, { top: 108, bottom: 140 }), 0);
	assert.equal(revealDelta(box, { top: 460, bottom: 492 }), 0);
});

test("a target above or below is brought in with a margin", () => {
	assert.equal(revealDelta(box, { top: 40, bottom: 70 }), -68);
	assert.equal(revealDelta(box, { top: 90, bottom: 120 }), -18);
	assert.equal(revealDelta(box, { top: 520, bottom: 560 }), 68);
	assert.equal(revealDelta(box, { top: 480, bottom: 500 }), 8);
});

test("the margin can be changed", () => {
	assert.equal(revealDelta(box, { top: 90, bottom: 120 }, 0), -10);
	assert.equal(revealDelta(box, { top: 480, bottom: 520 }, 0), 20);
});

test("a row fades only on the sides that have more to scroll to", () => {
	assert.equal(rowFade(0, 0), "none");
	assert.equal(rowFade(0, 300), "end");
	assert.equal(rowFade(120, 300), "both");
	assert.equal(rowFade(300, 300), "start");
	assert.equal(rowFade(299.5, 300), "start");
	assert.equal(rowFade(0.5, 300), "end");
});
