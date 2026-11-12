import assert from "node:assert/strict";
import test from "node:test";
import { pgtiOf } from "./pgti";

type Row = readonly [number, number, string, boolean];
type Spec = { acc: number; c: number; fc?: boolean; at?: string };

const EARLY = "2026-03-01T04:00:00Z";
const UNTIL = Date.parse("2026-12-31T15:59:59.999Z");
const DAYS = ["2026-01-10", "2026-02-10", "2026-03-10"];

const many = (n: number, spec: Spec): Spec[] =>
	Array.from({ length: n }, () => spec);

function scene(specs: Spec[]) {
	const constants = new Map<string, number>();
	const history: Record<string, Record<string, Row[]>> = {};
	specs.forEach((spec, i) => {
		const id = `S${i}.0`;
		constants.set(`${id}:IN`, spec.c);
		history[id] = {
			IN: [
				[
					spec.acc,
					Math.round(spec.acc * 10000),
					spec.at ?? EARLY,
					spec.fc ?? false,
				],
			],
		};
	});
	return { history, constants };
}

function run(
	specs: Spec[],
	over: {
		constants?: number[];
		until?: number;
		days?: string[];
		first?: string;
		last?: string;
		rks?: { start: number | null; end: number | null };
	} = {},
) {
	const { history, constants } = scene(specs);
	return pgtiOf({
		history,
		constantOf: (id, rank) => constants.get(`${id}:${rank}`),
		constants: over.constants ?? specs.map((s) => s.c),
		until: over.until ?? UNTIL,
		days: over.days ?? DAYS,
		first: over.first ?? "2026-01-01",
		last: over.last ?? "2026-03-31",
		rks: over.rks,
	});
}

const shown = (pgti: ReturnType<typeof run>) => {
	assert.ok(pgti);
	return pgti;
};

test("fewer than ten records give no player type", () => {
	assert.equal(run(many(9, { acc: 99, c: 14 })), null);
	assert.ok(run(many(10, { acc: 99, c: 14 })));
	const { history, constants } = scene(many(9, { acc: 99, c: 14 }));
	history["X.0"] = { IN: [[99, 990000, EARLY, false]] };
	history["Z.0"] = { IN: [[0, 0, EARLY, false]] };
	constants.set("Z.0:IN", 14);
	assert.equal(
		pgtiOf({
			history,
			constantOf: (id, rank) => constants.get(`${id}:${rank}`),
			constants: [14],
			until: UNTIL,
			days: DAYS,
			first: "2026-01-01",
			last: "2026-03-31",
		}),
		null,
	);
});

test("an upload after the end of the year is ignored and the earlier one is used", () => {
	const late = "2026-08-01T04:00:00Z";
	const until = Date.parse("2026-06-01T00:00:00Z");
	const { history, constants } = scene(many(12, { acc: 98, c: 12 }));
	history["S0.0"]!.IN!.push([100, 1000000, late, true]);
	const input = {
		history,
		constantOf: (id: string, rank: string) => constants.get(`${id}:${rank}`),
		constants: [12],
		days: DAYS,
		first: "2026-01-01",
		last: "2026-03-31",
	};
	const before = shown(pgtiOf({ ...input, until }));
	assert.equal(before.aim.acc, 98);
	assert.equal(before.grip.fc, 0);
	const after = shown(pgtiOf({ ...input, until: UNTIL }));
	assert.ok(Math.abs(after.aim.acc - (11 * 98 + 100) / 12) < 1e-9);
	assert.equal(after.grip.fc, 1);
	const onlyLate = [
		...many(9, { acc: 99, c: 14 }),
		{ acc: 99, c: 14, at: late },
	];
	assert.equal(run(onlyLate, { until }), null);
	assert.ok(run(onlyLate, { until: UNTIL }));
});

test("the aim is precise from an average of 98 and rough below it", () => {
	const precise = shown(run(many(12, { acc: 98, c: 12 })));
	assert.equal(precise.aim.letter, "P");
	assert.equal(precise.aim.acc, 98);
	const rough = shown(run(many(12, { acc: 97.99, c: 12 })));
	assert.equal(rough.aim.letter, "R");
	assert.ok(Math.abs(rough.aim.acc - 97.99) < 1e-9);
});

test("the range is wide when 60 percent of the charts near the zone are played", () => {
	const specs = many(12, { acc: 97.5, c: 12 });
	const wide = shown(run(specs, { constants: Array(20).fill(12) }));
	assert.equal(wide.range.letter, "E");
	assert.deepEqual([wide.range.played, wide.range.total], [12, 20]);
	const narrow = shown(run(specs, { constants: Array(21).fill(12) }));
	assert.equal(narrow.range.letter, "F");
	assert.equal(narrow.range.total, 21);
	const below = shown(run(specs, { constants: [...Array(20).fill(12), 10.9] }));
	assert.equal(below.range.total, 20);
	assert.equal(below.range.letter, "E");
	const flat = shown(run(specs, { constants: [] }));
	assert.equal(flat.range.letter, "F");
	assert.equal(flat.range.total, 0);
});

test("the grip is steady when half of the good records are full combos", () => {
	const steady = shown(
		run([
			...many(6, { acc: 97.5, c: 12, fc: true }),
			...many(6, { acc: 97.5, c: 12, fc: false }),
		]),
	);
	assert.equal(steady.grip.letter, "S");
	assert.deepEqual([steady.grip.fc, steady.grip.total], [6, 12]);
	const wobbly = shown(
		run([
			...many(5, { acc: 97.5, c: 12, fc: true }),
			...many(7, { acc: 97.5, c: 12, fc: false }),
		]),
	);
	assert.equal(wobbly.grip.letter, "W");
	assert.deepEqual([wobbly.grip.fc, wobbly.grip.total], [5, 12]);
});

test("the pace is a month rhythm when 60 percent of the months have progress", () => {
	const specs = many(12, { acc: 97.5, c: 12 });
	const months = (n: number) =>
		["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]
			.slice(0, n)
			.map((m) => `2026-${m}-12`);
	const monthly = shown(run(specs, { days: months(6), last: "2026-10-31" }));
	assert.equal(monthly.pace.letter, "M");
	assert.deepEqual([monthly.pace.months, monthly.pace.total], [6, 10]);
	const bursty = shown(run(specs, { days: months(5), last: "2026-10-31" }));
	assert.equal(bursty.pace.letter, "B");
	assert.deepEqual([bursty.pace.months, bursty.pace.total], [5, 10]);
	const crowded = shown(
		run(specs, {
			days: ["2026-01-02", "2026-01-03", "2026-01-04", "2026-02-10"],
			last: "2026-02-20",
		}),
	);
	assert.deepEqual([crowded.pace.months, crowded.pace.total], [2, 2]);
});

test("a pace window that starts in March counts months from March", () => {
	const specs = many(12, { acc: 97.5, c: 12 });
	const march = shown(
		run(specs, {
			first: "2026-03-15",
			last: "2026-06-02",
			days: ["2026-03-20", "2026-06-01"],
		}),
	);
	assert.deepEqual([march.pace.months, march.pace.total], [2, 4]);
	assert.equal(march.pace.letter, "B");
	const more = shown(
		run(specs, {
			first: "2026-03-15",
			last: "2026-06-02",
			days: ["2026-03-20", "2026-04-11", "2026-06-01"],
		}),
	);
	assert.deepEqual([more.pace.months, more.pace.total], [3, 4]);
	assert.equal(more.pace.letter, "M");
});

test("with more than 27 records only the best 27 feed the aim and the zone", () => {
	const pgti = shown(
		run([...many(27, { acc: 99, c: 15 }), ...many(3, { acc: 90, c: 10 })], {
			constants: [15, 14.2, 13.8, 13.8],
		}),
	);
	assert.equal(pgti.aim.acc, 99);
	assert.equal(pgti.aim.letter, "P");
	assert.equal(pgti.range.total, 2);
	assert.equal(pgti.range.played, 27);
});

test("records that tie on rks are ranked by the higher constant", () => {
	const pgti = shown(
		run(
			[...many(26, { acc: 99, c: 12 }), { acc: 60, c: 10 }, { acc: 60, c: 16 }],
			{ constants: [11.2, 11.1] },
		),
	);
	assert.equal(pgti.range.total, 1);
	assert.ok(Math.abs(pgti.aim.acc - (26 * 99 + 60) / 27) < 1e-9);
});

test("an all perfect counts as a full combo", () => {
	const pgti = shown(
		run(
			many(12, { acc: 100, c: 12, fc: false }).map((s, i) =>
				i % 2 === 0 ? s : { ...s, acc: 99.9 },
			),
		),
	);
	assert.deepEqual([pgti.grip.fc, pgti.grip.total], [6, 12]);
	assert.equal(pgti.grip.letter, "S");
});

test("the grip falls back to every record when fewer than five reach 97", () => {
	const few = shown(
		run([
			...many(4, { acc: 97.2, c: 12, fc: false }),
			...many(8, { acc: 96, c: 12, fc: true }),
		]),
	);
	assert.deepEqual([few.grip.fc, few.grip.total], [8, 12]);
	assert.equal(few.grip.letter, "S");
	const enough = shown(
		run([
			...many(5, { acc: 97.2, c: 12, fc: false }),
			...many(7, { acc: 96, c: 12, fc: true }),
		]),
	);
	assert.deepEqual([enough.grip.fc, enough.grip.total], [0, 5]);
	assert.equal(enough.grip.letter, "W");
});

test("the code is the four letters in the order aim, range, grip, pace", () => {
	const specs = many(12, { acc: 97, c: 12, fc: false });
	const rw = shown(
		run(specs, { constants: Array(21).fill(12), days: [DAYS[0]!] }),
	);
	assert.equal(rw.code, "RFWB");
	const pe = shown(
		run(many(12, { acc: 99, c: 12, fc: true }), {
			constants: Array(12).fill(12),
		}),
	);
	assert.equal(pe.code, "PESM");
	for (const pgti of [rw, pe])
		assert.equal(
			pgti.code,
			`${pgti.aim.letter}${pgti.range.letter}${pgti.grip.letter}${pgti.pace.letter}`,
		);
});

test("the growth letter needs both ends of the year and flips at a quarter point of RKS", () => {
	const base = many(12, { acc: 98.5, c: 14 });
	assert.equal(shown(run(base)).drive, null);
	assert.equal(shown(run(base, { rks: { start: null, end: 15 } })).drive, null);
	assert.equal(shown(run(base, { rks: { start: 14, end: null } })).drive, null);
	const grew = shown(run(base, { rks: { start: 14, end: 14.25 } })).drive;
	assert.equal(grew?.letter, "G");
	assert.ok(Math.abs((grew?.gain ?? 0) - 0.25) < 1e-9);
	assert.equal(
		shown(run(base, { rks: { start: 14, end: 14.2 } })).drive?.letter,
		"K",
	);
	assert.equal(
		shown(run(base, { rks: { start: 14.5, end: 14.1 } })).drive?.letter,
		"K",
	);
});

test("the family follows aim and range, the style follows grip and pace", () => {
	const wide = { constants: Array.from({ length: 12 }, () => 14) };
	const narrow = { constants: Array.from({ length: 40 }, () => 14) };
	const clean = many(12, { acc: 98.5, c: 14, fc: true });
	const rough = many(12, { acc: 97.2, c: 14, fc: false });
	const families = [
		[clean, wide, "collector"],
		[clean, narrow, "crafter"],
		[rough, wide, "adventurer"],
		[rough, narrow, "challenger"],
	] as const;
	for (const [specs, over, family] of families)
		assert.equal(shown(run([...specs], over)).family, family);
	const allYear = { days: DAYS, first: "2026-01-01", last: "2026-03-31" };
	const oneMonth = {
		days: ["2026-01-10"],
		first: "2026-01-01",
		last: "2026-06-30",
	};
	const styles = [
		[clean, allYear, "clockwork"],
		[clean, oneMonth, "ambush"],
		[rough, allYear, "grinder"],
		[rough, oneMonth, "fireworks"],
	] as const;
	for (const [specs, over, style] of styles)
		assert.equal(shown(run([...specs], over)).style, style);
});
