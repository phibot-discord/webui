import assert from "node:assert/strict";
import test from "node:test";
import {
	b30Under,
	diffTables,
	parseVersionMeta,
	parseVersionTable,
	pickVersions,
	rksSeries,
	rksUnder,
	slotMoves,
	yourChanges,
} from "./versions";

const OLD =
	"id\tEZ\tHD\tIN\tAT\nA.x\t1.0\t6.5\t12.5\t\nB.y\t4.5\t10.4\t13.7\t15.5\nGone.z\t2\t5\t9\t\n";
const NEW =
	"id\tsong\tcomposer\tillustrator\tEZC\tHDC\tINC\tATC\tEZ\tHD\tIN\tAT\n" +
	"A.x\tA\tc\ti\t\t\t\t\t1.0\t6.5\t12.6\t\n" +
	"B.y\tB\tc\ti\t\t\t\t\t4.5\t10.4\t13.7\t15.7\n" +
	"New.w\tNew\tc\ti\t\t\t\t\t3\t8\t13\t15.2\n";

test("both table layouts parse, ids get .0", () => {
	const old = parseVersionTable(OLD);
	assert.deepEqual(old.get("A.x.0"), { levels: { EZ: 1, HD: 6.5, IN: 12.5 } });
	const now = parseVersionTable(`\uFEFF${NEW}`);
	assert.equal(now.get("New.w.0")?.song, "New");
	assert.equal(now.get("B.y.0")?.levels.AT, 15.7);
	assert.equal(parseVersionTable("nope\n1\t2").size, 0);
});

test("version meta needs a label", () => {
	assert.deepEqual(
		parseVersionMeta(
			{ version_label: "3.19.5", update_date: 1785402000, whatsnew: " 1. x " },
			153,
		),
		{ code: 153, label: "3.19.5", date: 1785402000000, notes: "1. x" },
	);
	assert.equal(parseVersionMeta({ update_date: 1 }, 1), undefined);
});

test("a diff lists added, removed and changed charts, biggest change first", () => {
	const d = diffTables(parseVersionTable(OLD), parseVersionTable(NEW));
	assert.deepEqual(
		d.added.map((s) => s.id),
		["New.w.0"],
	);
	assert.deepEqual(
		d.removed.map((s) => s.id),
		["Gone.z.0"],
	);
	assert.deepEqual(
		d.changed.map((c) => [c.id, c.rank, c.from, c.to]),
		[
			["B.y.0", "AT", 15.5, 15.7],
			["A.x.0", "IN", 12.5, 12.6],
		],
	);
});

test("RKS under a table uses that table's constants", () => {
	const records = [
		{ id: "B.y.0", rank: "AT", acc: 100 },
		{ id: "A.x.0", rank: "IN", acc: 100 },
		{ id: "Gone.z.0", rank: "IN", acc: 100 },
	];
	const old = rksUnder(records, parseVersionTable(OLD));
	const now = rksUnder(records, parseVersionTable(NEW));
	assert.equal(old.charts, 3);
	assert.equal(now.charts, 2);
	assert.ok(Math.abs(now.rks - ((15.7 + 12.6) * 2) / 30) < 1e-9);
});

test("picking versions defaults to the newest and the one before", () => {
	const codes = [92, 100, 153, 160];
	assert.deepEqual(pickVersions(codes, undefined, undefined), {
		from: 153,
		to: 160,
	});
	assert.deepEqual(pickVersions(codes, 92, undefined), { from: 92, to: 160 });
	assert.deepEqual(pickVersions(codes, 160, 100), { from: 100, to: 160 });
	assert.deepEqual(pickVersions(codes, 100, 100), { from: 92, to: 100 });
	assert.deepEqual(pickVersions(codes, undefined, 92), { from: 92, to: 100 });
	assert.deepEqual(pickVersions(codes, 7, 8), { from: 153, to: 160 });
	assert.equal(pickVersions([160], undefined, undefined), undefined);
});

test("B30 under a table keeps 27 best plus 3 APs, and moves track slot changes", () => {
	const a = parseVersionTable(
		"id\tIN\tAT\nA.x\t15.0\t\nB.y\t14.0\t\nC.z\t13.0\t\n",
	);
	const b = parseVersionTable(
		"id\tIN\tAT\nA.x\t15.0\t\nB.y\t12.0\t\nC.z\t13.5\t\n",
	);
	const records = [
		{ id: "A.x.0", rank: "IN", acc: 100 },
		{ id: "B.y.0", rank: "IN", acc: 99 },
		{ id: "C.z.0", rank: "IN", acc: 98 },
	];
	const ua = b30Under(records, a);
	const ub = b30Under(records, b);
	assert.equal(ua.slots.size, 3);
	assert.equal(ua.slots.get("A.x.0:IN")?.phi, true);
	assert.ok(Math.abs(ua.rks - rksUnder(records, a).rks) < 1e-9);
	const changed = diffTables(a, b).changed;
	const mine = yourChanges(records, changed, ua, ub);
	assert.deepEqual(
		mine.map((c) => [c.id, c.move]),
		[
			["B.y.0", "stay"],
			["C.z.0", "stay"],
		],
	);
	assert.ok(mine[0]!.after < mine[0]!.before);
	assert.deepEqual(slotMoves(ua, ub), { entered: [], left: [] });
});

test("an RKS series skips nothing and reports the change from the previous version", () => {
	const records = [{ id: "A.x.0", rank: "IN", acc: 100 }];
	const t1 = parseVersionTable("id\tIN\nA.x\t15.0\n");
	const t2 = parseVersionTable("id\tIN\nA.x\t15.2\n");
	const s = rksSeries(records, [
		{ code: 2, label: "2", date: null, notes: "", table: t2 },
		{ code: 1, label: "1", date: null, notes: "", table: t1 },
	]);
	assert.deepEqual(
		s.map((p) => p.code),
		[1, 2],
	);
	assert.equal(s[0]!.delta, null);
	assert.ok((s[1]!.delta ?? 0) > 0);
});
