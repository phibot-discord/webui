#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "./lib/render.mjs";
import b30 from "./models/b30.mjs";
import chart from "./models/chart.mjs";
import pez from "./models/pez.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/drawings");
const FIT = [364, 241];
const RISE = 16,
	PAD = 4,
	LANE = 15,
	GAP = 22;
const ROLES = ["outline", "edge", "detail", "texture"];

const num = (n) => String(Math.round(n * 10) / 10);
const pt = ([x, y]) => `${num(x)} ${num(y)}`;

/** Joins pieces that share an end into polylines */
function chain(pieces) {
	const heads = new Map(),
		tails = new Map(),
		lines = [];
	for (const piece of pieces) {
		let [p, q] = piece.map(pt);
		if (p === q) continue;
		let line = tails.get(p);
		if (!line && tails.has(q)) [p, q] = [q, p];
		line = tails.get(p);
		if (line) {
			tails.delete(p);
			line.push(q);
			tails.set(q, line);
			continue;
		}
		if (!heads.has(q) && heads.has(p)) [p, q] = [q, p];
		line = heads.get(q);
		if (line) {
			heads.delete(q);
			line.unshift(p);
			heads.set(p, line);
			continue;
		}
		line = [p, q];
		lines.push(line);
		heads.set(p, line);
		tails.set(q, line);
	}
	return lines.map((l) => `M${l.join("L")}`).join("");
}

function lanes(anchors, bounds, gap = GAP) {
	const left = bounds.x - LANE,
		right = bounds.x + bounds.width + LANE;
	const placed = [];
	for (const side of ["left", "right"]) {
		const list = anchors
			.filter((a) => a.side === side)
			.sort((p, q) => p.point[1] - q.point[1]);
		const ys = list.map((a) => a.point[1]);
		for (let i = 1; i < ys.length; i++)
			ys[i] = Math.max(ys[i], ys[i - 1] + gap);
		list.forEach((a, i) => {
			placed.push({ ...a, at: [side === "left" ? left : right, ys[i]] });
		});
	}
	for (const a of anchors.filter((a) => a.side === "above"))
		placed.push({ ...a, at: [a.point[0], a.point[1] - RISE] });
	return placed;
}

function leaders(placed) {
	return placed
		.map(({ point, at, side }) => {
			const elbow =
				side === "above" ? at[0] : at[0] + (side === "left" ? 6 : -6);
			return (
				`<path data-line-role="detail" d="M${pt(point)}L${pt([elbow, at[1]])}L${pt(at)}"/>` +
				`<circle cx="${num(point[0])}" cy="${num(point[1])}" r=".7"/>`
			);
		})
		.join("");
}

function sheet(model, drawn, v, order) {
	const result = render(drawn.parts, {
		view: model.view,
		amount: v.amount,
		trails: drawn.trails,
		anchors: drawn.anchors,
		fit: FIT,
	});
	for (const [id, share] of Object.entries(result.seen))
		if (share < 0.5)
			console.warn(
				`  ${model.id}/${v.name}: ${id} shows ${Math.round(share * 100)}% of its lines`,
			);

	const lift = (id) => {
		const [dx, dy] = result.shifts[id];
		const moved = Math.abs(dx) >= 0.05 || Math.abs(dy) >= 0.05;
		return ` style="--i:${order.indexOf(id)}${moved ? `;--dx:${num(-dx)};--dy:${num(-dy)}` : ""}"`;
	};
	const fills = [];
	for (const f of result.fills) {
		const d = `M${f.outline.map(pt).join("L")}Z`;
		const last = fills.at(-1);
		if (last?.id === f.id) last.d += d;
		else fills.push({ id: f.id, d });
	}
	const items = order.map((id) => {
		const paths = ROLES.map((role) => {
			const d = chain(
				result.ink
					.filter((s) => s.id === id && s.role === role)
					.map((s) => [s.p, s.q]),
			);
			return d ? `<path data-line-role="${role}" d="${d}"/>` : "";
		}).join("");
		return `<g data-part="${id}"${lift(id)}>${paths}</g>`;
	});
	const trails = chain(
		result.ink.filter((s) => s.role === "axis").map((s) => [s.p, s.q]),
	);

	const b = result.bounds;
	const placed = v.tags ? lanes(result.anchors, b, v.gap) : [];
	const numbering =
		v.order === "model"
			? result.anchors.map((a) => a.id)
			: [...placed]
					.sort((p, q) => p.at[1] - q.at[1] || p.at[0] - q.at[0])
					.map((p) => p.id);
	const xs = [b.x, b.x + b.width, ...placed.map((p) => p.at[0])],
		ys = [b.y, b.y + b.height, ...placed.map((p) => p.at[1])];
	const box = [Math.min(...xs) - PAD, Math.min(...ys) - PAD];
	box.push(Math.max(...xs) + PAD - box[0], Math.max(...ys) + PAD - box[1]);

	const svg =
		`<g data-fills="">${fills.map((f) => `<path data-part="${f.id}"${lift(f.id)} d="${f.d}"/>`).join("")}</g>` +
		items.join("") +
		(trails
			? `<g data-trails=""><path data-line-role="axis" d="${trails}"/></g>`
			: "") +
		(placed.length ? `<g data-leaders="">${leaders(placed)}</g>` : "");

	return {
		viewBox: box.map(num).join(" "),
		ratio: Math.round((box[2] / box[3]) * 10000) / 10000,
		svg,
		tags: placed
			.map((p) => ({
				id: p.id,
				n: numbering.indexOf(p.id) + 1,
				x: Math.round(((p.at[0] - box[0]) / box[2]) * 1000) / 10,
				y: Math.round(((p.at[1] - box[1]) / box[3]) * 1000) / 10,
			}))
			.sort((p, q) => p.n - q.n),
	};
}

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
		model.views.map((v) => [v.name, sheet(model, drawn, v, order)]),
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
