const CREASE_COS = Math.cos((30 * Math.PI) / 180);
const DEPTH_EPS = 1e-3;
const INSET = 1e-4;
const MIN_PIECE = 0.02;

const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const scale = (a, k) => a.map((v) => v * k);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const turn = (o, a, b) =>
	(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const span = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
const box2 = (...pts) => [
	Math.min(...pts.map((p) => p[0])),
	Math.min(...pts.map((p) => p[1])),
	Math.max(...pts.map((p) => p[0])),
	Math.max(...pts.map((p) => p[1])),
];

function camera({ azimuth, elevation }) {
	const a = (azimuth * Math.PI) / 180,
		e = (elevation * Math.PI) / 180;
	const toEye = [
		Math.cos(e) * Math.cos(a),
		Math.cos(e) * Math.sin(a),
		Math.sin(e),
	];
	const right = [-Math.sin(a), Math.cos(a), 0];
	const up = cross(toEye, right);
	return {
		toEye,
		project: (p) => [dot(p, right), -dot(p, up), -dot(p, toEye)],
	};
}

function newell(points, face) {
	let x = 0,
		y = 0,
		z = 0;
	for (let i = 0; i < face.length; i++) {
		const p = points[face[i]],
			q = points[face[(i + 1) % face.length]];
		x += (p[1] - q[1]) * (p[2] + q[2]);
		y += (p[2] - q[2]) * (p[0] + q[0]);
		z += (p[0] - q[0]) * (p[1] + q[1]);
	}
	const len = Math.hypot(x, y, z);
	return len ? [x * (1 / len), y * (1 / len), z * (1 / len)] : [x, y, z];
}

function occluder(face) {
	let area = 0;
	for (let i = 1; i + 1 < face.length; i++)
		area += turn(face[0], face[i], face[i + 1]);
	if (Math.abs(area) < 1e-9) return undefined;
	const loop = area < 0 ? [...face].reverse() : face;
	const edges = [];
	loop.forEach((p, i) => {
		const q = loop[(i + 1) % loop.length];
		const len = span(p, q);
		if (len < 1e-12) return;
		const nx = -(q[1] - p[1]) / len,
			ny = (q[0] - p[0]) / len;
		edges.push(nx, ny, nx * p[0] + ny * p[1]);
	});
	const a = loop[0];
	let b = loop[1],
		c = loop[2],
		widest = 0;
	for (let i = 1; i + 1 < loop.length; i++) {
		const t = turn(a, loop[i], loop[i + 1]);
		if (t > widest) [b, c, widest] = [loop[i], loop[i + 1], t];
	}
	const da = a[2],
		db = b[2] - da,
		dc = c[2] - da;
	const bx = b[0] - a[0],
		by = b[1] - a[1],
		cx = c[0] - a[0],
		cy = c[1] - a[1];
	const alpha = (db * cy - dc * by) / widest,
		beta = (bx * dc - cx * db) / widest;
	return {
		edges,
		plane: [alpha, beta, da - alpha * a[0] - beta * a[1]],
		box: box2(...loop),
		near: Math.min(...loop.map((p) => p[2])),
	};
}

function hidden(s, e, tri) {
	const dx = e[0] - s[0],
		dy = e[1] - s[1];
	const edges = tri.edges;
	let lo = 0,
		hi = 1;
	for (let i = 0; i < edges.length; i += 3) {
		const nx = edges[i],
			ny = edges[i + 1];
		const p = nx * s[0] + ny * s[1] - edges[i + 2],
			q = nx * dx + ny * dy;
		if (Math.abs(q) < 1e-12) {
			if (p >= INSET) continue;
			return undefined;
		}
		const t = (INSET - p) / q;
		if (q > 0) lo = Math.max(lo, t);
		else hi = Math.min(hi, t);
		if (!(lo < hi)) return undefined;
	}
	const [alpha, beta, gamma] = tri.plane;
	const p = s[2] - (alpha * s[0] + beta * s[1] + gamma),
		q = e[2] - s[2] - (alpha * dx + beta * dy);
	if (Math.abs(q) < 1e-12) return p >= DEPTH_EPS ? [lo, hi] : undefined;
	const t = (DEPTH_EPS - p) / q;
	if (q > 0) lo = Math.max(lo, t);
	else hi = Math.min(hi, t);
	return lo < hi ? [lo, hi] : undefined;
}

function grid(occluders) {
	const n = Math.max(1, Math.min(48, Math.ceil(Math.sqrt(occluders.length))));
	let x0 = Infinity,
		y0 = Infinity,
		x1 = -Infinity,
		y1 = -Infinity;
	for (const { box } of occluders) {
		x0 = Math.min(x0, box[0]);
		y0 = Math.min(y0, box[1]);
		x1 = Math.max(x1, box[2]);
		y1 = Math.max(y1, box[3]);
	}
	const w = (x1 - x0) / n || 1,
		h = (y1 - y0) / n || 1;
	const col = (x) => Math.min(n - 1, Math.max(0, Math.floor((x - x0) / w)));
	const row = (y) => Math.min(n - 1, Math.max(0, Math.floor((y - y0) / h)));
	const cells = Array.from({ length: n * n }, () => []);
	occluders.forEach(({ box }, i) => {
		for (let r = row(box[1]); r <= row(box[3]); r++)
			for (let c = col(box[0]); c <= col(box[2]); c++) cells[r * n + c].push(i);
	});
	const stamp = new Uint32Array(occluders.length);
	let query = 0;
	return (box) => {
		query++;
		const near = [];
		for (let r = row(box[1]); r <= row(box[3]); r++)
			for (let c = col(box[0]); c <= col(box[2]); c++)
				for (const i of cells[r * n + c])
					if (stamp[i] !== query) {
						stamp[i] = query;
						near.push(occluders[i]);
					}
		return near;
	};
}

function visiblePieces(s, e, nearby) {
	const len = span(s, e);
	if (len < MIN_PIECE) return [];
	const box = box2(s, e);
	const far = Math.max(s[2], e[2]);
	const cover = [];
	for (const tri of nearby(box)) {
		if (tri.near >= far - DEPTH_EPS) continue;
		const b = tri.box;
		if (b[0] > box[2] || b[2] < box[0] || b[1] > box[3] || b[3] < box[1])
			continue;
		const h = hidden(s, e, tri);
		if (h) cover.push(h);
	}
	cover.sort((p, q) => p[0] - q[0]);
	const pieces = [];
	let t = 0;
	for (const [lo, hi] of cover) {
		if (lo > t) pieces.push([t, lo]);
		t = Math.max(t, hi);
	}
	if (t < 1) pieces.push([t, 1]);
	const at = (u) => [s[0] + (e[0] - s[0]) * u, s[1] + (e[1] - s[1]) * u];
	return pieces
		.filter(([lo, hi]) => (hi - lo) * len >= MIN_PIECE)
		.map(([lo, hi]) => [at(lo), at(hi)]);
}

function hull(points) {
	const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
	const half = (list) => {
		const out = [];
		for (const p of list) {
			while (out.length >= 2 && turn(out.at(-2), out.at(-1), p) <= 0) out.pop();
			out.push(p);
		}
		out.pop();
		return out;
	};
	return [...half(sorted), ...half(sorted.reverse())];
}

const SIDES = new WeakMap();

function sidesOf(faces) {
	let list = SIDES.get(faces);
	if (list) return list;
	const sides = new Map();
	faces.forEach((face, f) => {
		face.forEach((v, i) => {
			const w = face[(i + 1) % face.length];
			const key = v < w ? `${v},${w}` : `${w},${v}`;
			const entry = sides.get(key);
			if (entry) entry.faces.push(f);
			else sides.set(key, { v, w, faces: [f] });
		});
	});
	list = [...sides.values()];
	SIDES.set(faces, list);
	return list;
}

function solidEdges(points, faces, toEye) {
	const normals = faces.map((f) => newell(points, f));
	const front = normals.map((n) => dot(n, toEye) > 1e-9);
	const edges = [];
	for (const {
		v,
		w,
		faces: [f, g],
	} of sidesOf(faces)) {
		let role;
		if (g === undefined) role = front[f] ? "outline" : undefined;
		else if (front[f] !== front[g]) role = "outline";
		else if (front[f] && dot(normals[f], normals[g]) < CREASE_COS)
			role = "edge";
		if (role) edges.push({ a: points[v], b: points[w], role });
	}
	return { edges, front };
}

export function render(
	parts,
	{ view, amount = 1, trails = [], anchors = [], fit },
) {
	const cam = camera(view);
	const shift = new Map(parts.map((p) => [p.id, scale(p.lift, amount)]));
	const placed = parts.map((part) => ({
		part,
		solids: part.solids.map(({ points, faces }) => ({
			points: points.map((p) => add(p, shift.get(part.id))),
			faces,
		})),
		lines: part.lines.map((l) => ({
			...l,
			points: l.points.map((p) => add(p, shift.get(part.id))),
		})),
	}));

	const occluders = [];
	const candidates = [];
	const hulls = [];
	for (const { part, solids, lines } of placed) {
		for (const { points, faces } of solids) {
			const screen = points.map(cam.project);
			const { edges, front } = solidEdges(points, faces, cam.toEye);
			for (const { a, b, role } of edges)
				candidates.push({
					id: part.id,
					role,
					a: cam.project(a),
					b: cam.project(b),
				});
			if (!part.clear) {
				faces.forEach((face, f) => {
					if (!front[f]) return;
					const o = occluder(face.map((i) => screen[i]));
					if (o) occluders.push(o);
				});
				hulls.push({
					id: part.id,
					height: points.reduce((sum, p) => sum + p[2], 0) / points.length,
					outline: hull(screen.map(([x, y]) => [x, y])),
				});
			}
		}
		for (const { points, role, closed } of lines) {
			const n = closed ? points.length : points.length - 1;
			for (let i = 0; i < n; i++)
				candidates.push({
					id: part.id,
					role,
					a: cam.project(points[i]),
					b: cam.project(points[(i + 1) % points.length]),
				});
		}
	}
	for (const t of trails)
		candidates.push({
			id: null,
			role: "axis",
			a: cam.project(add(t.a, shift.get(t.from))),
			b: cam.project(add(t.b, shift.get(t.to))),
		});

	const ink = [];
	const seen = new Map(parts.map((p) => [p.id, { drawn: 0, shown: 0 }]));
	const nearby = grid(occluders);
	for (const c of candidates) {
		const pieces = visiblePieces(c.a, c.b, nearby);
		if (c.id) {
			const stat = seen.get(c.id);
			stat.drawn += span(c.a, c.b);
			for (const [p, q] of pieces) stat.shown += span(p, q);
		}
		for (const [p, q] of pieces) ink.push({ id: c.id, role: c.role, p, q });
	}

	const corners = [
		...ink.flatMap(({ p, q }) => [p, q]),
		...hulls.flatMap((h) => h.outline),
	];
	const xs = corners.map((c) => c[0]),
		ys = corners.map((c) => c[1]);
	const minX = Math.min(...xs),
		minY = Math.min(...ys);
	const k = Math.min(
		fit[0] / (Math.max(...xs) - minX),
		fit[1] / (Math.max(...ys) - minY),
	);
	const toSheet = ([x, y]) => [(x - minX) * k, (y - minY) * k];

	const flat = (v) => {
		const [x, y] = cam.project(v);
		return [x * k, y * k];
	};
	const origin = flat([0, 0, 0]);
	return {
		bounds: {
			x: 0,
			y: 0,
			width: (Math.max(...xs) - minX) * k,
			height: (Math.max(...ys) - minY) * k,
		},
		ink: ink.map(({ id, role, p, q }) => ({
			id,
			role,
			p: toSheet(p),
			q: toSheet(q),
		})),
		fills: hulls
			.sort((p, q) => p.height - q.height)
			.map(({ id, outline }) => ({ id, outline: outline.map(toSheet) })),
		anchors: anchors.map((a) => ({
			id: a.id,
			side: a.side,
			point: toSheet(cam.project(add(a.at, shift.get(a.id)))),
		})),
		shifts: Object.fromEntries(
			parts.map((p) => [p.id, sub(flat(shift.get(p.id)), origin)]),
		),
		seen: Object.fromEntries(
			[...seen].map(([id, s]) => [id, s.drawn ? s.shown / s.drawn : 1]),
		),
		scale: k,
		place: (v) => toSheet(cam.project(v)),
	};
}
