import assert from "node:assert/strict";
import test from "node:test";
import type { SaveHistory } from "@/phi/lib/save-history";
import type { ChartSummary } from "./charts";
import { hasRecap } from "./recap-ready";

const list: ChartSummary[] = [
	{ id: "A.0", song: "Song A", composer: "", charts: { IN: [15, 800] } },
];

type History = Pick<SaveHistory, "rks" | "scoreHistory">;

const history = (scoreHistory: SaveHistory["scoreHistory"]): History => ({
	scoreHistory,
	rks: [],
});

test("a player has a recap only with an upload inside the year on a rated chart", () => {
	assert.equal(hasRecap(history({}), list), false);
	assert.equal(
		hasRecap(
			history({ "A.0": { IN: [[95, 950000, "2025-06-01T04:00:00Z", false]] } }),
			list,
		),
		false,
	);
	assert.equal(
		hasRecap(
			history({
				"A.0": {
					IN: [
						[95, 950000, "2025-06-01T04:00:00Z", false],
						[97, 970000, "2026-03-01T04:00:00Z", false],
					],
				},
			}),
			list,
		),
		true,
	);
	assert.equal(
		hasRecap(
			history({ "Z.0": { IN: [[97, 970000, "2026-03-01T04:00:00Z", false]] } }),
			list,
		),
		false,
	);
	assert.equal(
		hasRecap(
			history({ "A.0": { IN: [[97, 970000, "2026-03-01T04:00:00Z", false]] } }),
			list,
			2025,
		),
		false,
	);
});

test("a save first seen inside the year has a recap once it is uploaded again on a later day", () => {
	assert.equal(
		hasRecap(
			history({ "A.0": { IN: [[95, 950000, "2026-12-05T04:00:00Z", false]] } }),
			list,
		),
		false,
	);
	assert.equal(
		hasRecap(
			history({
				"A.0": {
					IN: [
						[95, 950000, "2026-12-05T04:00:00Z", false],
						[96, 960000, "2026-12-09T04:00:00Z", false],
					],
				},
			}),
			list,
		),
		true,
	);
});
