import { Part } from "../shapes.mjs";

const W = 120,
	D = 108,
	ROWS = 10,
	TOP = 2.2,
	GAP = 3;

export default {
	id: "b30",
	view: { azimuth: -116, elevation: 34 },
	views: [
		{ name: "exploded", amount: 1, tags: true },
		{ name: "assembled", amount: 0 },
		{ name: "front", amount: 0, view: { azimuth: -90, elevation: 90 } },
	],
	build() {
		const backdrop = new Part("backdrop")
			.block([0, 0, 0], [W, D, 1.4], 3)
			.picture([5, 5], [W - 5, D - 5], 1.41);

		const panel = new Part("panel", { lift: [0, 0, 26], clear: true }).block(
			[4, 4, 1.5],
			[W - 4, D - 4, 2.1],
			2,
		);

		const header = new Part("header", { lift: [0, 0, 74] })
			.block([8, 86, TOP], [W - 8, 100, TOP + 1.4], 1.6)
			.disc([17.5, 93], 5, TOP + 1.3, TOP + 2.5)
			.block([84, 89, TOP + 1.3], [W - 11, 97, TOP + 2.3], 1)
			.text(26, 62, 95.5, TOP + 1.41)
			.text(26, 48, 91, TOP + 1.41)
			.text(88, W - 15, 93, TOP + 2.31);

		const tileW = (W - 16 - GAP * 2) / 3;
		const phi = new Part("phi", { lift: [0, 0, 62] });
		for (let c = 0; c < 3; c++) {
			const x = 8 + c * (tileW + GAP),
				z = TOP + 1.21;
			phi
				.block([x, 72, TOP], [x + tileW, 82, TOP + 1.2], 1)
				.frame([x + 1.4, 73.4], [x + 11, 80.6], z)
				.text(x + 13.5, x + tileW - 3, 79, z)
				.text(x + 13.5, x + tileW - 9, 75.5, z);
		}

		const best = new Part("best", { lift: [0, 0, 50] });
		const rowH = (66 - 8 - (ROWS - 1) * 1.4) / ROWS;
		for (let r = 0; r < ROWS; r++)
			for (let c = 0; c < 3; c++) {
				const x = 8 + c * (tileW + GAP),
					y = 66 - (r + 1) * rowH - r * 1.4,
					z = TOP + 0.91;
				best
					.block([x, y, TOP], [x + tileW, y + rowH, TOP + 0.9])
					.frame([x + 0.9, y + 0.8], [x + 7.5, y + rowH - 0.8], z, "texture")
					.text(x + 10, x + tileW - 3, y + rowH / 2, z);
			}

		return {
			parts: [backdrop, panel, best, phi, header],
			anchors: [
				{ id: "header", at: [W - 8, 93, TOP + 1.4], side: "right" },
				{ id: "phi", at: [W - 8, 77, TOP + 1.2], side: "right" },
				{ id: "best", at: [W - 8, 30, TOP + 0.9], side: "right" },
				{ id: "panel", at: [4, 30, 2.1], side: "left" },
				{ id: "backdrop", at: [0, 30, 1.4], side: "left" },
			],
		};
	},
};
