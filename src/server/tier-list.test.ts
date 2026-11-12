import assert from "node:assert/strict";
import test from "node:test";
import type { ChartSummary } from "./charts";
import { illKey } from "./ill";
import { pickLevel, tierItems, tierLevels } from "./tier-list";

const LIST: ChartSummary[] = [
	{
		id: "Alpha.Ann.0",
		song: "Alpha",
		composer: "Ann",
		charts: { EZ: [3.5, 300], HD: [8.2, 600], IN: [14.6, 900] },
	},
	{
		id: "Beta.Bob.0",
		song: "Beta",
		composer: "Bob",
		charts: { EZ: [4, 320], HD: [9, 640], IN: [14.9, 1000], AT: [14.3, 1100] },
	},
	{
		id: "Gamma.Cy.0",
		song: "Gamma",
		composer: "Cy",
		charts: { HD: [8.9, 500], IN: [15.8, 1200] },
	},
];

function counted() {
	const asked: string[] = [];
	const links = (key: string) => {
		asked.push(key);
		return `https://cdn.test/${key}`;
	};
	return { asked, links };
}

test("levels are counted from every chart's whole-number constant, highest first", () => {
	assert.deepEqual(tierLevels(LIST), [
		{ level: 15, count: 1 },
		{ level: 14, count: 3 },
		{ level: 9, count: 1 },
		{ level: 8, count: 2 },
		{ level: 4, count: 1 },
		{ level: 3, count: 1 },
	]);
});

test("the charts of a level come with title, constant and jacket, highest constant first", () => {
	const { links } = counted();
	assert.deepEqual(tierItems(LIST, 8, links), [
		{
			key: "Gamma.Cy.0:HD",
			id: "Gamma.Cy.0",
			rank: "HD",
			c: 8.9,
			title: "Gamma",
			jacket: `https://cdn.test/${illKey("Gamma.Cy", "low")}`,
		},
		{
			key: "Alpha.Ann.0:HD",
			id: "Alpha.Ann.0",
			rank: "HD",
			c: 8.2,
			title: "Alpha",
			jacket: `https://cdn.test/${illKey("Alpha.Ann", "low")}`,
		},
	]);
	assert.deepEqual(
		tierItems(LIST, 15, () => undefined),
		[
			{
				key: "Gamma.Cy.0:IN",
				id: "Gamma.Cy.0",
				rank: "IN",
				c: 15.8,
				title: "Gamma",
			},
		],
	);
});

test("a song with two charts of one level asks for its jacket once and gives both charts", () => {
	const { asked, links } = counted();
	const items = tierItems(LIST, 14, links);
	assert.deepEqual(
		items.map((i) => i.key),
		["Beta.Bob.0:IN", "Alpha.Ann.0:IN", "Beta.Bob.0:AT"],
	);
	assert.deepEqual(asked, [
		illKey("Alpha.Ann", "low"),
		illKey("Beta.Bob", "low"),
	]);
	const beta = `https://cdn.test/${illKey("Beta.Bob", "low")}`;
	assert.equal(items[0]?.jacket, beta);
	assert.equal(items[2]?.jacket, beta);
});

test("the asked level is used when it exists, otherwise the highest level with ten charts, otherwise the highest level", () => {
	const levels = [
		{ level: 16, count: 4 },
		{ level: 15, count: 12 },
		{ level: 14, count: 30 },
	];
	assert.equal(pickLevel(levels, "14"), 14);
	assert.equal(pickLevel(levels, "17"), 15);
	assert.equal(pickLevel(levels, "14.5"), 15);
	assert.equal(pickLevel(levels, "abc"), 15);
	assert.equal(pickLevel(levels, undefined), 15);
	assert.equal(
		pickLevel(
			[
				{ level: 16, count: 4 },
				{ level: 15, count: 3 },
			],
			undefined,
		),
		16,
	);
	assert.equal(pickLevel([], "14"), undefined);
});
