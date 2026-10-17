import assert from "node:assert/strict";
import test from "node:test";
import {
	type Deduction,
	DeductionSim,
	dedText,
	levelsGain,
	parseDeduction,
} from "./deduction";

const raw = {
	v: 1,
	pages: [
		{ visual: 0, lines: [{ "zh-CN": "一二三", en: "One" }] },
		{
			visual: 1,
			lines: [
				{ "zh-CN": "四五", en: "Four" },
				{ "zh-CN": "六", ko: "" },
			],
		},
		{ visual: 2, lines: [{ "zh-CN": "七" }] },
	],
	layers: {
		img1: { file: "deduction/img1.jpg", width: 2048, height: 1152 },
		img2: { file: "deduction/img2.jpg", width: 2048, height: 1152 },
		img3: { file: "../x.jpg", width: 2048, height: 1152 },
	},
	gradient: { file: "deduction/gradient.png", width: 1, height: 285 },
	sounds: {
		ambient: { file: "deduction/ambient.ogg", volume: 0, loop: true },
		img2SE: { file: "deduction/img2SE.ogg", volume: 1, loop: false },
		whiteToImg3SE: { file: "deduction/whiteToImg3SE.ogg" },
	},
	typing: [{ file: "deduction/typing.ogg", volume: 1, loop: false }],
	fade: { in: 0.5, out: 1.5 },
};

function data(): Deduction {
	const parsed = parseDeduction(raw);
	assert.ok(parsed);
	return parsed;
}

function run(sim: DeductionSim, frames: number, taps: number[] = []) {
	const sounds: { frame: number; what: string }[] = [];
	for (let f = 0; f < frames; f++) {
		const at = sim.at;
		for (const e of sim.step(taps.includes(at))) {
			sounds.push({
				frame: e.frame,
				what: e.kind === "typing" ? `typing${e.voice}` : e.sound,
			});
		}
	}
	return sounds;
}

test("the manifest is read with its files kept inside deduction/", () => {
	const d = data();
	assert.equal(d.pages.length, 3);
	assert.equal(d.layers.img3, undefined);
	assert.equal(d.sounds.whiteToImg3SE?.volume, 1);
	assert.equal(d.typing.length, 1);
	assert.equal(parseDeduction({ ...raw, v: 2 }), undefined);
	assert.equal(parseDeduction({ ...raw, layers: {} }), undefined);
});

test("lines fall back as the game does: English for a set language, Chinese last", () => {
	assert.equal(dedText({ "zh-CN": "中", en: "En", ko: "" }, "ko"), "En");
	assert.equal(dedText({ "zh-CN": "中" }, "ja"), "中");
	assert.equal(dedText({ en: "En" }, "zh-CN"), "En");
	assert.equal(dedText({ "zh-CN": "中", en: "" }, "en"), "中");
});

test("the scene opens white, then types its first line by itself on frame 92", () => {
	const sim = new DeductionSim(data(), "zh-CN");
	assert.equal(sim.view().levels, 1);
	const sounds = run(sim, 92);
	assert.deepEqual(sounds, []);
	const before = sim.view();
	assert.equal(before.levels, 0);
	assert.equal(before.gradient, 1);
	assert.equal(before.group, 1);
	assert.equal(before.ambient, 1);
	assert.equal(before.lines[0]?.shown, null);
	const typed = run(sim, 13);
	assert.deepEqual(
		typed.map((s) => s.frame),
		[92, 96, 100],
	);
	assert.deepEqual(
		typed.map((s) => s.what),
		["typing0", "typing1", "typing2"],
	);
	const done = sim.view();
	assert.equal(done.lines[0]?.shown, 3);
	assert.equal(done.lines[0]?.cursor, false);
	assert.equal(done.indicator, 0);
});

test("▼ waits half a second after the last line, fades in for half a second, and a tap moves on", () => {
	const sim = new DeductionSim(data(), "en");
	run(sim, 92 + 4 * 3 + 1);
	const end = 92 + 4 * 3;
	run(sim, end + 30 - sim.at);
	assert.equal(sim.view().indicator, 0);
	run(sim, 1);
	assert.ok(sim.view().indicator > 0);
	run(sim, end + 60 - sim.at);
	assert.equal(sim.view().indicator, 1);
	const tap = sim.at;
	const sounds = run(sim, 160, [tap]);
	assert.deepEqual(
		sounds.filter((s) => !s.what.startsWith("typing")),
		[{ frame: tap + 30 + 60, what: "img2SE" }],
	);
	assert.equal(
		sounds.find((s) => s.what.startsWith("typing"))?.frame,
		tap + 150,
	);
});

test("a tap mid-line completes it, the next line on the page waits for a tap, and transitions ignore taps", () => {
	const sim = new DeductionSim(data(), "en");
	run(sim, 94, [93]);
	assert.equal(sim.view().lines[0]?.shown, 3);
	const tap = sim.at;
	run(sim, 200, [tap, tap + 40, tap + 100]);
	const page = sim.view();
	assert.equal(page.page, 1);
	assert.equal(page.lines[0]?.shown, 4);
	assert.equal(page.lines[1]?.shown, null);
	const next = sim.at;
	run(sim, 2, [next]);
	assert.equal(sim.view().lines[1]?.shown, 0);
	assert.equal(sim.view().lines[1]?.full, "六");
});

function idle(sim: DeductionSim) {
	for (let n = 0; n < 2000 && !sim.idle; n++) sim.step();
	assert.ok(sim.idle);
}

function tapThrough(sim: DeductionSim, taps: number) {
	for (let n = 0; n < taps; n++) {
		idle(sim);
		sim.step(true);
	}
	idle(sim);
}

test("visual 2 flashes white, swaps in Img3 while white, and its page types three seconds after the tap", () => {
	const sim = new DeductionSim(data(), "zh-CN");
	tapThrough(sim, 2);
	assert.equal(sim.view().page, 1);
	assert.equal(sim.view().lines[1]?.shown, 1);
	const tap = sim.at;
	const sounds = run(sim, 200, [tap]);
	assert.deepEqual(
		sounds.filter((s) => !s.what.startsWith("typing")),
		[{ frame: tap + 30, what: "whiteToImg3SE" }],
	);
	assert.equal(
		sounds.find((s) => s.what.startsWith("typing"))?.frame,
		tap + 180,
	);
	assert.equal(sim.view().layers.img3, 1);
	assert.equal(sim.view().levels, 0);
});

test("the last tap washes everything to white with the ambience and ends the scene", () => {
	const sim = new DeductionSim(data(), "zh-CN");
	tapThrough(sim, 3);
	assert.equal(sim.view().page, 2);
	assert.equal(sim.view().lines[0]?.shown, 1);
	const tap = sim.at;
	run(sim, 30, [tap]);
	assert.equal(sim.done, false);
	assert.equal(sim.view().levels, 1);
	run(sim, 1);
	assert.equal(sim.done, true);
	assert.equal(sim.view().ambient, 0);
	assert.equal(levelsGain(0), 1);
	assert.ok(levelsGain(1) > 900);
});
