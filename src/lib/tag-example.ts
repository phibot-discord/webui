import { nines, PROFILE, weightOf } from "@/phi/lib/tag-profile";

export const EXAMPLE_TAGS = ["快交互", "宽排键"] as const;

export const EXAMPLE_FLOOR = 15.9;

export const EXAMPLE_VOTED = "2026-11-04";

const CHARTS = [
	{
		id: "GOODRAGE.EBIMAYO.0",
		title: "GOODRAGE",
		level: "IN",
		c: 16.0,
		acc: 99.1,
		curve: 1.9,
		votes: [20, 0],
		total: 60,
	},
	{
		id: "DistortedFate.Sakuzyo.0",
		title: "Distorted Fate",
		level: "IN",
		c: 16.3,
		acc: 98.4,
		curve: 1.78,
		votes: [18, 15],
		total: 75,
	},
	{
		id: "RetributionCycleofRedemption.ArdolfvsDaily天利.0",
		title: "Retribution ~ Cycle of Redemption ~",
		level: "IN",
		c: 16.2,
		acc: 96.8,
		curve: 1.82,
		votes: [2, 30],
		total: 67,
	},
] as const;

export type ExampleRow = {
	id: string;
	title: string;
	level: string;
	c: number;
	acc: number;
	w: number;
	y: number;
	curve: number;
	d: number;
	votes: [number, number];
	total: number;
	shares: [number, number];
};

export type TagExample = {
	tags: readonly [string, string];
	floor: number;
	min: number;
	prior: number;
	ridge: number;
	minShare: number;
	rows: ExampleRow[];
	sumShare: [number, number];
	average: [number, number];
	beta: [number, number];
	shift: number;
	centred: [number, number];
	meanShare: [number, number];
	net: [number, number];
};

export function tagExample(): TagExample {
	const rows: ExampleRow[] = CHARTS.map((c) => {
		const y = nines(c.acc);
		const shares = c.votes.map((v) =>
			v / c.total >= PROFILE.minShare ? v / c.total : 0,
		) as [number, number];
		return {
			id: c.id,
			title: c.title,
			level: c.level,
			c: c.c,
			acc: c.acc,
			w: weightOf(c.acc),
			y,
			curve: c.curve,
			d: y - c.curve,
			votes: [c.votes[0], c.votes[1]],
			total: c.total,
			shares,
		};
	});
	const both = [0, 1] as const;
	const sumShare = both.map((j) =>
		rows.reduce((s, r) => s + r.shares[j] * r.w, 0),
	) as [number, number];
	const average = both.map(
		(j) =>
			rows.reduce((s, r) => s + r.shares[j] * r.w * r.d, 0) /
			(sumShare[j] + PROFILE.prior),
	) as [number, number];
	let a = PROFILE.ridge;
	let b = 0;
	let d = PROFILE.ridge;
	let u = 0;
	let v = 0;
	for (const r of rows) {
		const [p, q] = r.shares;
		a += r.w * p * p;
		b += r.w * p * q;
		d += r.w * q * q;
		u += r.w * p * r.d;
		v += r.w * q * r.d;
	}
	const det = a * d - b * b;
	const beta: [number, number] = [(d * u - b * v) / det, (a * v - b * u) / det];
	let sw = 0;
	let st = 0;
	for (const r of rows) {
		if (!r.shares[0] && !r.shares[1]) continue;
		sw += r.w;
		st += r.w * (beta[0] * r.shares[0] + beta[1] * r.shares[1]);
	}
	const shift = sw > 0 ? st / sw : 0;
	const centred = both.map((j) => beta[j] - shift) as [number, number];
	const meanShare = both.map(
		(j) =>
			rows.reduce((s, r) => s + r.shares[j] * r.shares[j] * r.w, 0) /
			sumShare[j],
	) as [number, number];
	const net = both.map((j) => centred[j] * meanShare[j]) as [number, number];
	return {
		tags: EXAMPLE_TAGS,
		floor: EXAMPLE_FLOOR,
		min:
			Math.ceil(Math.round((EXAMPLE_FLOOR - PROFILE.below) * 1000) / 100) / 10,
		prior: PROFILE.prior,
		ridge: PROFILE.ridge,
		minShare: PROFILE.minShare,
		rows,
		sumShare,
		average,
		beta,
		shift,
		centred,
		meanShare,
		net,
	};
}
