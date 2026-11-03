import type { NoteKinds } from "./chart-stats";

export type ChartFeature = {
	id: string;
	rank: string;
	c: number;
	notes: number | null;
	kinds: NoteKinds | null;
	length: number | null;
	bpm: number | null;
};

export type SimilarHit = { id: string; rank: string; c: number; d: number };

export type Suggestion = SimilarHit & { seed: { id: string; rank: string } };

type Vec = (number | null)[];

type Row = { f: ChartFeature; v: Vec };

export type SimilarIndex = {
	rows: Row[];
	at: Map<string, number>;
};

const WEIGHTS = [2, 1.5, 1, 1, 1, 1, 0.5];
const MAX_GAP = 1.5;
const SIMILAR_MAX = 6;
const SUGGEST_ABOVE = 0.5;
const SUGGEST_BELOW = 1;

export function parseLength(raw: string | undefined): number | null {
	const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(raw ?? "");
	if (!m) return null;
	const s = Number(m[1]) * 60 + Number(m[2]);
	return s > 0 ? s : null;
}

export function parseBpm(raw: string | undefined): number | null {
	const nums = (raw ?? "").match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
	const top = Math.max(0, ...nums.filter((n) => n > 0 && n < 2000));
	return top > 0 ? top : null;
}

const keyOf = (id: string, rank: string) => `${id}\u0000${rank}`;

function raw(f: ChartFeature): Vec {
	const total = f.kinds
		? f.kinds.tap + f.kinds.drag + f.kinds.hold + f.kinds.flick
		: 0;
	const share = (n: number) => (total > 0 ? n / total : null);
	const notes = f.notes ?? (total || null);
	return [
		f.c,
		notes && f.length ? Math.log(notes / f.length) : null,
		f.kinds ? share(f.kinds.tap) : null,
		f.kinds ? share(f.kinds.drag) : null,
		f.kinds ? share(f.kinds.hold) : null,
		f.kinds ? share(f.kinds.flick) : null,
		f.bpm ? Math.log(f.bpm) : null,
	];
}

export function buildSimilarIndex(
	features: readonly ChartFeature[],
): SimilarIndex {
	const rows = features.map(raw);
	const dims = WEIGHTS.length;
	const mean: number[] = [];
	const sd: number[] = [];
	for (let k = 0; k < dims; k++) {
		const vals = rows.flatMap((r) => (r[k] == null ? [] : [r[k] as number]));
		const mu = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
		const v = vals.length
			? vals.reduce((a, b) => a + (b - mu) ** 2, 0) / vals.length
			: 0;
		mean.push(mu);
		sd.push(Math.sqrt(v) || 1);
	}
	const out: Row[] = features.map((f, i) => ({
		f,
		v: (rows[i] ?? []).map((x, k) =>
			x == null ? null : (x - (mean[k] ?? 0)) / (sd[k] ?? 1),
		),
	}));
	const at = new Map(features.map((f, i) => [keyOf(f.id, f.rank), i] as const));
	return { rows: out, at };
}

function distance(a: Vec, b: Vec): number {
	let sum = 0;
	let weight = 0;
	for (let k = 0; k < WEIGHTS.length; k++) {
		const x = a[k];
		const y = b[k];
		if (x == null || y == null) continue;
		const w = WEIGHTS[k] ?? 1;
		sum += w * (x - y) ** 2;
		weight += w;
	}
	return weight ? Math.sqrt(sum / weight) : Number.POSITIVE_INFINITY;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function similarTo(
	index: SimilarIndex,
	id: string,
	rank: string,
): SimilarHit[] {
	const self = index.rows[index.at.get(keyOf(id, rank)) ?? -1];
	if (!self) return [];
	const hits: SimilarHit[] = [];
	for (const { f, v } of index.rows) {
		if (f.id === id || Math.abs(f.c - self.f.c) > MAX_GAP) continue;
		const d = distance(self.v, v);
		if (Number.isFinite(d))
			hits.push({ id: f.id, rank: f.rank, c: f.c, d: round(d) });
	}
	hits.sort((a, b) => a.d - b.d || b.c - a.c || (a.id < b.id ? -1 : 1));
	return hits.slice(0, SIMILAR_MAX);
}

export function suggestFrom(
	index: SimilarIndex,
	seeds: readonly { id: string; rank: string }[],
	want: (f: ChartFeature) => boolean,
	limit = 10,
): Suggestion[] {
	const seedRows = seeds.flatMap((s) => {
		const row = index.rows[index.at.get(keyOf(s.id, s.rank)) ?? -1];
		return row ? [row] : [];
	});
	if (!seedRows.length) return [];
	const out: Suggestion[] = [];
	for (const { f, v } of index.rows) {
		if (!want(f)) continue;
		let best: { d: number; seed: ChartFeature } | undefined;
		for (const seed of seedRows) {
			if (seed.f.id === f.id) continue;
			if (f.c > seed.f.c + SUGGEST_ABOVE || f.c < seed.f.c - SUGGEST_BELOW)
				continue;
			const d = distance(seed.v, v);
			if (!best || d < best.d) best = { d, seed: seed.f };
		}
		if (!best || !Number.isFinite(best.d)) continue;
		out.push({
			id: f.id,
			rank: f.rank,
			c: f.c,
			d: round(best.d),
			seed: { id: best.seed.id, rank: best.seed.rank },
		});
	}
	out.sort((a, b) => a.d - b.d || b.c - a.c || (a.id < b.id ? -1 : 1));
	return out.slice(0, limit);
}
