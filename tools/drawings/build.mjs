#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import b30 from "../../src/lib/drawings/models/b30.mjs";
import chart from "../../src/lib/drawings/models/chart.mjs";
import pez from "../../src/lib/drawings/models/pez.mjs";
import { sheet } from "../../src/lib/drawings/sheet.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/drawings");

function check(id, parts, views) {
	for (const [name, v] of Object.entries(views)) {
		if (!v.viewBox || !v.ratio || !v.svg || !Array.isArray(v.tags))
			throw Error(`${id}/${name} is missing a field`);
		for (const part of parts)
			if (!v.svg.includes(`<g data-part="${part}"`))
				throw Error(`${id}/${name} has no ink for ${part}`);
	}
}

mkdirSync(OUT, { recursive: true });
for (const model of [b30, chart, pez]) {
	const drawn = model.build();
	const order = drawn.parts.map((p) => p.id);
	const views = Object.fromEntries(
		model.views.map((v) => {
			const { seen, frame, ...drawing } = sheet(drawn, v, v.view ?? model.view);
			for (const [id, share] of Object.entries(seen))
				if (share < 0.5)
					console.warn(
						`  ${model.id}/${v.name}: ${id} shows ${Math.round(share * 100)}% of its lines`,
					);
			return [v.name, drawing];
		}),
	);
	check(model.id, order, views);
	writeFileSync(
		join(OUT, `${model.id}.json`),
		`${JSON.stringify({ id: model.id, parts: order, views })}\n`,
	);
	console.log(
		`${model.id}: ${Object.entries(views)
			.map(([k, v]) => `${k} ${(v.svg.length / 1024).toFixed(1)} KB`)
			.join(", ")}`,
	);
}
