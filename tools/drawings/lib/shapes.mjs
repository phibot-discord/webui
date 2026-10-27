const CORNER_STEPS = 6;

/** Counter-clockwise outline of a rectangle with rounded corners, seen from +z */
export function roundRect([x0, y0], [x1, y1], radius = 0) {
	if (radius <= 0)
		return [
			[x0, y0],
			[x1, y0],
			[x1, y1],
			[x0, y1],
		];
	const r = Math.min(radius, (x1 - x0) / 2, (y1 - y0) / 2);
	const corners = [
		[x1 - r, y0 + r, -90],
		[x1 - r, y1 - r, 0],
		[x0 + r, y1 - r, 90],
		[x0 + r, y0 + r, 180],
	];
	const loop = [];
	for (const [cx, cy, from] of corners)
		for (let i = 0; i <= CORNER_STEPS; i++) {
			const a = ((from + (90 * i) / CORNER_STEPS) * Math.PI) / 180;
			loop.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
		}
	return loop;
}

/** Counter-clockwise circle outline, seen from +z */
function circleLoop([cx, cy], r, steps) {
	return Array.from({ length: steps }, (_, i) => {
		const a = (i / steps) * Math.PI * 2;
		return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
	});
}

/**
 * One drawn part: closed solids with outward faces, plus lines marked on them.
 * `lift` is how far the part moves in the exploded view; a `clear` part hides nothing.
 */
export class Part {
	constructor(id, { lift = [0, 0, 0], clear = false } = {}) {
		this.id = id;
		this.lift = lift;
		this.clear = clear;
		this.solids = [];
		this.lines = [];
		this.place = (p) => p;
	}

	/** Builds inside a local frame; `place` maps local points to the part's frame */
	within(place, build) {
		const outer = this.place;
		this.place = (p) => outer(place(p));
		build(this);
		this.place = outer;
		return this;
	}

	solid(points, faces) {
		this.solids.push({ points: points.map(this.place), faces });
		return this;
	}

	/** A prism standing on a counter-clockwise outline */
	slab(loop, z0, z1) {
		const n = loop.length;
		const points = [
			...loop.map(([x, y]) => [x, y, z0]),
			...loop.map(([x, y]) => [x, y, z1]),
		];
		const faces = [loop.map((_, i) => n + i), loop.map((_, i) => n - 1 - i)];
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			faces.push([i, j, n + j, n + i]);
		}
		return this.solid(points, faces);
	}

	/** A prism with a hole; both outlines counter-clockwise with matching vertices */
	ring(outer, inner, z0, z1) {
		const n = outer.length;
		if (inner.length !== n) throw Error("ring outlines need matching vertices");
		const points = [
			...outer.map(([x, y]) => [x, y, z0]),
			...outer.map(([x, y]) => [x, y, z1]),
			...inner.map(([x, y]) => [x, y, z0]),
			...inner.map(([x, y]) => [x, y, z1]),
		];
		const faces = [];
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n;
			faces.push(
				[i, j, n + j, n + i],
				[2 * n + j, 2 * n + i, 3 * n + i, 3 * n + j],
				[n + i, n + j, 3 * n + j, 3 * n + i],
				[2 * n + i, 2 * n + j, j, i],
			);
		}
		return this.solid(points, faces);
	}

	block([x0, y0, z0], [x1, y1, z1], radius = 0) {
		return this.slab(roundRect([x0, y0], [x1, y1], radius), z0, z1);
	}

	disc(center, radius, z0, z1, { hole = 0, steps = 96 } = {}) {
		const outer = circleLoop(center, radius, steps);
		return hole > 0
			? this.ring(outer, circleLoop(center, hole, steps), z0, z1)
			: this.slab(outer, z0, z1);
	}

	line(points, role = "detail", closed = false) {
		this.lines.push({ points: points.map(this.place), role, closed });
		return this;
	}

	loop(outline, z, role = "detail") {
		return this.line(
			outline.map(([x, y]) => [x, y, z]),
			role,
			true,
		);
	}

	circle(center, radius, z, role = "detail", steps = 72) {
		return this.loop(circleLoop(center, radius, steps), z, role);
	}

	/** A framed rectangle drawn flat at height z */
	frame(from, to, z, role = "detail") {
		return this.loop(roundRect(from, to), z, role);
	}

	/** One stroke standing in for a line of text */
	text(x0, x1, y, z, role = "texture") {
		return this.line(
			[
				[x0, y, z],
				[x1, y, z],
			],
			role,
		);
	}

	/** A sun and a ridge, standing in for a picture */
	picture([x0, y0], [x1, y1], z, role = "detail") {
		const w = x1 - x0,
			h = y1 - y0;
		this.circle([x0 + w * 0.8, y0 + h * 0.76], Math.min(w, h) * 0.11, z, role);
		return this.line(
			[
				[0.04, 0.12],
				[0.3, 0.52],
				[0.46, 0.32],
				[0.62, 0.54],
				[0.96, 0.14],
			].map(([u, v]) => [x0 + w * u, y0 + h * v, z]),
			role,
		);
	}
}
