import assert from "node:assert/strict";
import test from "node:test";
import { describeUnlock, splitWords, type UnlockCopy } from "./unlock";

const copy: UnlockCopy = {
	score: "Score ≥ {n} on {chart}",
	scoreOnly: "Score ≥ {n}",
	accuracy: "Accuracy ≥ {n}% on {chart}",
	level: "an {level} chart",
	after: "Opens after {items}",
	flags: "Story progress: {items}",
	from: "Opens from {place}",
	raw: "Condition: {data}",
	unlocked: "unlocked",
	reached: "reached",
};

const titles: Record<string, string> = {
	"m9beginning#1": "D.O.M.E.",
	"nizhidaoma#2": "[Decipher] About The Universe",
	"sundemimi#3": "Notebook III",
};
const titleOf = (key: string, sub: number) => titles[`${key}#${sub}`];
const say = (type: number, ...info: string[]) =>
	describeUnlock({ type, info }, copy, titleOf);

test("no condition says nothing", () => {
	assert.equal(say(-1), undefined);
	assert.equal(say(-1, "", ""), undefined);
});

test("a score threshold names the chart and groups the digits", () => {
	assert.equal(
		say(0, "Engine x Start!! (melody mix)IN", "840000"),
		"Score ≥ 840,000 on Engine x Start!! (melody mix) IN",
	);
	assert.equal(say(0, "StasisAT", "700000"), "Score ≥ 700,000 on Stasis AT");
	assert.equal(
		say(0, "混乱-ConfusionEZ", "600000"),
		"Score ≥ 600,000 on 混乱-Confusion EZ",
	);
});

test("a score can name only a difficulty, or no chart at all", () => {
	assert.equal(say(2, "HD", "", "950000"), "Score ≥ 950,000 on an HD chart");
	assert.equal(say(2, "", "", "880000"), "Score ≥ 880,000");
	assert.equal(
		say(2, "Cipher : /2&//<|0IN", "", "880000"),
		"Score ≥ 880,000 on Cipher : /2&//<|0 IN",
	);
});

test("two thresholds are both shown", () => {
	assert.equal(
		say(0, "Sultan RageIN", "820000", "960000"),
		"Score ≥ 820,000 / 960,000 on Sultan Rage IN",
	);
});

test("an accuracy threshold is a percentage", () => {
	assert.equal(say(1, "光IN", "100"), "Accuracy ≥ 100% on 光 IN");
	assert.equal(
		say(1, "ProtoflickerIN", "95"),
		"Accuracy ≥ 95% on Protoflicker IN",
	);
});

test("values that fit no known reading are shown as they are", () => {
	assert.equal(say(2, "EZ", "5"), "Condition: EZ · 5");
	assert.equal(
		say(2, "混乱-ConfusionIN", "8"),
		"Condition: 混乱-ConfusionIN · 8",
	);
	assert.equal(say(3, "Horizon Blue", "0"), "Condition: Horizon Blue · 0");
	assert.equal(
		say(0, "+ERABY+E CONNEC+10NAT", "1"),
		"Condition: +ERABY+E CONNEC+10NAT · 1",
	);
	assert.equal(say(1, "光IN", "250"), "Condition: 光IN · 250");
	assert.equal(say(9, "x"), "Condition: x");
	assert.equal(say(3), undefined);
});

test("story flags read as words, an item reached by title", () => {
	assert.equal(
		say(7, "C9ExoplanetaryMirageUnlocked,C9EntranceToTheChaosUnlocked"),
		"Story progress: Exoplanetary Mirage unlocked, Entrance To The Chaos unlocked",
	);
	assert.equal(
		say(7, "C9BaselineChallengeReached"),
		"Story progress: Baseline Challenge reached",
	);
	assert.equal(say(7, "C9S6Unlocked"), "Story progress: S6 unlocked");
	assert.equal(say(7, "SomethingElse"), "Story progress: Something Else");
	assert.equal(
		say(5, "Chapter9SelectMusic"),
		"Opens from Chapter 9 Select Music",
	);
	assert.equal(say(6, "m9beginning", "0"), "Opens after D.O.M.E.");
	assert.equal(say(6, "unknownkey", "0"), "Opens after unknownkey");
	assert.equal(
		say(8, "nizhidaoma2,sundemimi3"),
		"Opens after [Decipher] About The Universe, Notebook III",
	);
	assert.equal(say(8, "nope1"), "Opens after nope#1");
});

test("camel case splits into words", () => {
	assert.equal(splitWords("EntranceToTheChaos"), "Entrance To The Chaos");
	assert.equal(splitWords("S6"), "S6");
	assert.equal(splitWords("DesultorySignals"), "Desultory Signals");
});
