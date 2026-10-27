import { Part, roundRect } from "../lib/shapes.mjs";

const W = 86,
	D = 64,
	H = 12,
	WALL = 2.2,
	LIFT = 44;

export default {
	id: "pez",
	view: { azimuth: -116, elevation: 34 },
	views: [{ name: "exploded", amount: 1, tags: true }],
	build() {
		const inner = roundRect([WALL, WALL], [W - WALL, D - WALL], 2);
		const pack = new Part("pack")
			.ring(roundRect([0, 0], [W, D], 4), inner, 0, H)
			.block(
				[WALL - 0.4, WALL - 0.4, 0.01],
				[W - WALL + 0.4, D - WALL + 0.4, 2],
			)
			.loop(inner, 2.05)
			.line(
				[
					[W / 2 - 12, -0.05, 3.5],
					[W / 2 + 12, -0.05, 3.5],
					[W / 2 + 12, -0.05, 8.5],
					[W / 2 - 12, -0.05, 8.5],
				],
				"detail",
				true,
			);

		const chart = new Part("chart", { lift: [-16, 8, LIFT + 34] })
			.block([6, 8, 2.1], [40, 56, 2.9], 1)
			.line([
				[11.5, 50, 2.91],
				[9.5, 47.5, 2.91],
				[11.5, 45, 2.91],
			]);
		for (let i = 0; i < 7; i++)
			chart.text(14 + (i % 3) * 2, 36 - (i % 2) * 7, 50 - i * 5, 2.91);

		const art = new Part("art", { lift: [22, 14, LIFT + 46] })
			.block([38, 30, 3], [80, 58, 3.8], 1)
			.picture([40.5, 32.5], [77.5, 55.5], 3.81);

		const music = new Part("music", { lift: [28, -14, LIFT - 6] })
			.disc([60, 18], 14, 2.1, 3.3, { hole: 2.2, steps: 120 })
			.circle([60, 18], 5.2, 3.31, "detail", 96)
			.circle([60, 18], 10.5, 3.31, "texture", 120);

		const info = new Part("info", { lift: [-56, -8, LIFT + 20] }).block(
			[12, 12, 3],
			[36, 28, 3.6],
			0.8,
		);
		for (let i = 0; i < 3; i++) info.text(15, 32 - i * 4, 24 - i * 4, 3.61);

		return {
			parts: [pack, music, info, chart, art],
			anchors: [
				{ id: "art", at: [80, 44, 3.8], side: "right" },
				{ id: "chart", at: [6, 40, 2.9], side: "left" },
				{ id: "music", at: [74, 18, 3.3], side: "right" },
				{ id: "info", at: [12, 20, 3.6], side: "left" },
				{ id: "pack", at: [W, D * 0.3, H], side: "right" },
			],
		};
	},
};
