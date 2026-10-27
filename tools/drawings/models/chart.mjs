import { Part } from "../lib/shapes.mjs";

const W = 110,
	D = 62,
	TILT = -6,
	TOP = 1.3;

const turn = (TILT * Math.PI) / 180,
	cos = Math.cos(turn),
	sin = Math.sin(turn);
const centre = [W / 2, D * 0.24, 1.3];
/** The judge line's frame: x along the line, z up from the illustration */
const onLine = ([x, y, z]) => [
	centre[0] + x * cos - y * sin,
	centre[1] + x * sin + y * cos,
	centre[2] + z,
];

function note(id, [x0, y0], [x1, y1], height, lift, mark) {
	return new Part(id, { lift: [0, 0, lift] }).within(onLine, (p) => {
		const top = TOP + 0.1 + height;
		p.block([x0, y0, TOP + 0.1], [x1, y1, top], Math.min(0.6, (y1 - y0) / 3));
		mark?.(p, top + 0.01);
	});
}

export default {
	id: "chart",
	view: { azimuth: -116, elevation: 40 },
	views: [{ name: "exploded", amount: 1, tags: true, gap: 30, order: "model" }],
	build() {
		const art = new Part("art")
			.block([0, 0, 0], [W, D, 1.2], 2)
			.picture([4, 4], [W - 4, D - 4], 1.21);

		const line = new Part("line", { lift: [0, 0, 16] }).within(onLine, (p) =>
			p.block([-68, -1.3, 0], [68, 1.3, TOP], 0.6),
		);

		const tap = note("tap", [31, -2.2], [53, 2.2], 2, 28);
		const drag = note("drag", [-24, -1.3], [-3, 1.3], 1.4, 42);
		const flick = note("flick", [3, -2.2], [25, 2.2], 2, 36, (p, z) =>
			p.line([
				[8, -1.2, z],
				[14, 1.4, z],
				[20, -1.2, z],
			]),
		);
		const hold = new Part("hold", { lift: [0, 0, 22] }).within(onLine, (p) =>
			p
				.block([-52, -2.2, TOP + 0.1], [-30, 2.4, TOP + 2.1], 0.6)
				.block([-50.5, 2.3, TOP + 0.1], [-31.5, 36, TOP + 1.1], 0.6)
				.line(
					[
						[-41, 4.5, TOP + 1.11],
						[-41, 33.5, TOP + 1.11],
					],
					"texture",
				),
		);

		const landing = (id, x) => ({
			a: onLine([x, 0, TOP + 0.1]),
			b: onLine([x, 0, TOP]),
			from: id,
			to: "line",
		});

		return {
			parts: [art, line, tap, drag, flick, hold],
			trails: [
				landing("hold", -41),
				landing("drag", -13.5),
				landing("flick", 14),
				landing("tap", 42),
			],
			anchors: [
				{ id: "line", at: onLine([68, 0, TOP]), side: "right" },
				{ id: "tap", at: onLine([42, 0, TOP + 2.1]), side: "above" },
				{ id: "drag", at: onLine([-13.5, 0, TOP + 1.5]), side: "above" },
				{ id: "hold", at: onLine([-52, 0, TOP + 2.1]), side: "left" },
				{ id: "flick", at: onLine([14, 0, TOP + 2.1]), side: "above" },
				{ id: "art", at: [0, D * 0.1, 1.2], side: "left" },
			],
		};
	},
};
