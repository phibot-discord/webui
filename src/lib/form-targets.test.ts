import assert from "node:assert/strict";
import test from "node:test";
import { parseTagVotes } from "@/phi/lib/chart-tag-votes";
import { fCompute } from "@/phi/lib/fcompute";
import type { ProfileRecord } from "@/phi/lib/tag-profile";
import { formTargets } from "./form-targets";

const TREE = [{ id: 10, name: "读谱", children: [{ id: 1, name: "差速" }] }];

function world(dipAt: number, dip: number) {
	const records: ProfileRecord[] = [];
	const charts: Record<
		string,
		{ votes: Record<string, Record<number, number>> }
	> = {};
	for (let i = 0; i < 60; i++) {
		const difficulty = Math.round((15 + i * 0.03) * 100) / 100;
		const acc = 99.5 - (difficulty - 15) * 0.6 - (i === dipAt ? dip : 0);
		records.push({
			id: `s${i}.0`,
			level: "IN",
			difficulty,
			rks: fCompute.rks(acc, difficulty),
			acc,
		});
		charts[`s${i}`] = { votes: { IN: { 1: 5 } } };
	}
	return { records, votes: parseTagVotes({ sha: "t", tree: TREE, charts }) };
}

test("a chart well under the player's usual form comes first, with a positive gain", () => {
	const { records, votes } = world(55, 3);
	const rows = formTargets(records, votes);
	assert.ok(rows.length > 0);
	const top = rows[0]!;
	assert.equal(top.id, "s55.0");
	assert.ok(top.expected > top.acc + 2);
	assert.ok(top.gain > 0);
	for (const r of rows) assert.ok(r.expected > r.acc && r.gain > 0);
	for (let i = 1; i < rows.length; i++)
		assert.ok(rows[i - 1]!.gain >= rows[i]!.gain);
});

test("too few voted charts give no targets", () => {
	const { records, votes } = world(55, 3);
	assert.deepEqual(formTargets(records.slice(0, 5), votes), []);
});
