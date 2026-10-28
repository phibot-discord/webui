import { render } from "./render.mjs";

const FIT = [364, 241];
const RISE = 16,
	PAD = 4,
	LANE = 15,
	GAP = 22;
const ROLES = ["outline", "edge", "detail", "texture"];

const num = (n) => String(Math.round(n * 10) / 10);
const pt = ([x, y]) => `${num(x)} ${num(y)}`;

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

export function sheet(drawn, v, view) {
	const order = drawn.parts.map((p) => p.id);
	const result = render(drawn.parts, {
		view,
		amount: v.amount,
		trails: drawn.trails,
		anchors: drawn.anchors,
		fit: FIT,
	});

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
		seen: result.seen,
		frame: {
			box,
			bare: [b.x - PAD, b.y - PAD, b.width + PAD * 2, b.height + PAD * 2],
			tags: placed.map((p) => ({ id: p.id, at: p.at })),
			scale: result.scale,
			place: result.place,
			width: b.width / result.scale,
		},
	};
}
