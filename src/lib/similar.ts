import type { NoteKinds } from "./chart-stats";

export type ChartFeature = {
	id: string;
	rank: string;
	c: number;
	notes: number | null;
	kinds: NoteKinds | null;
	length: number | null;
	bpm: number | null;
	tags?: ReadonlyMap<number, number> | null;
};

export type SimilarHit = { id: string; rank: string; c: number; d: number };

export type Suggestion = SimilarHit & { seed: { id: string; rank: string } };

type Tags = { v: ReadonlyMap<number, number>; norm: number };

type Row = {
	f: ChartFeature;
	density: number | null;
	mix: number[] | null;
	bpm: number | null;
	tags: Tags | null;
};

type Scale = { density: number; mix: number; tags: number };

export type SimilarIndex = {
	rows: Row[];
	at: Map<string, number>;
	scale: Scale;
};

const WEIGHT = { c: 2, density: 1, mix: 1.5, bpm: 0.3, tags: 2.5 };
const C_SCALE = 0.35;
const BPM_SCALE = 0.25;
const UNTAGGED = 1;
const SCALE_GAP = 1;
const MAX_GAP = 1;
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

function rowOf(f: ChartFeature): Row {
	const k = f.kinds;
	const total = k ? k.tap + k.drag + k.hold + k.flick : 0;
	const notes = f.notes ?? (total || null);
	let tags: Tags | null = null;
	if (f.tags?.size) {
		let sum = 0;
		for (const v of f.tags.values()) sum += v * v;
		if (sum > 0) tags = { v: f.tags, norm: Math.sqrt(sum) };
	}
	return {
		f,
		density: notes && f.length ? Math.log(notes / f.length) : null,
		mix:
			k && total > 0
				? [k.tap, k.drag, k.hold, k.flick].map((n) => Math.sqrt(n / total))
				: null,
		bpm: f.bpm ? Math.log(f.bpm) : null,
		tags,
	};
}

function mixGap(a: number[], b: number[]): number {
	let s = 0;
	for (let i = 0; i < a.length; i++) s += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
	return s;
}

function tagGap(a: Tags, b: Tags): number {
	let dot = 0;
	for (const [tag, v] of a.v) dot += v * (b.v.get(tag) ?? 0);
	return 1 - dot / (a.norm * b.norm);
}

function median(values: number[], fallback: number): number {
	if (!values.length) return fallback;
	values.sort((a, b) => a - b);
	return values[Math.floor(values.length / 2)] || fallback;
}

export function buildSimilarIndex(
	features: readonly ChartFeature[],
): SimilarIndex {
	const rows = features.map(rowOf);
	const dens = rows.flatMap((r) => (r.density == null ? [] : [r.density]));
	const mu = dens.length ? dens.reduce((a, b) => a + b, 0) / dens.length : 0;
	const sd = dens.length
		? Math.sqrt(dens.reduce((a, b) => a + (b - mu) ** 2, 0) / dens.length)
		: 0;
	const mixes: number[] = [];
	const tagGaps: number[] = [];
	const byC = [...rows].sort((a, b) => a.f.c - b.f.c);
	for (let i = 0; i < byC.length; i++) {
		const a = byC[i]!;
		for (let j = i + 1; j < byC.length; j++) {
			const b = byC[j]!;
			if (b.f.c - a.f.c > SCALE_GAP) break;
			if (a.f.id === b.f.id) continue;
			if (a.mix && b.mix) mixes.push(mixGap(a.mix, b.mix));
			if (a.tags && b.tags) tagGaps.push(tagGap(a.tags, b.tags));
		}
	}
	const at = new Map(features.map((f, i) => [keyOf(f.id, f.rank), i] as const));
	return {
		rows,
		at,
		scale: {
			density: sd || 1,
			mix: median(mixes, 0.1),
			tags: median(tagGaps, 0.85),
		},
	};
}

function distance(scale: Scale, a: Row, b: Row): number {
	let sum = WEIGHT.c * ((a.f.c - b.f.c) / C_SCALE) ** 2;
	let weight = WEIGHT.c;
	if (a.density != null && b.density != null) {
		sum += WEIGHT.density * ((a.density - b.density) / scale.density) ** 2;
		weight += WEIGHT.density;
	}
	if (a.mix && b.mix) {
		sum += (WEIGHT.mix * mixGap(a.mix, b.mix)) / scale.mix;
		weight += WEIGHT.mix;
	}
	if (a.bpm != null && b.bpm != null) {
		sum += WEIGHT.bpm * ((a.bpm - b.bpm) / BPM_SCALE) ** 2;
		weight += WEIGHT.bpm;
	}
	if (a.tags) {
		sum +=
			WEIGHT.tags * (b.tags ? tagGap(a.tags, b.tags) / scale.tags : UNTAGGED);
		weight += WEIGHT.tags;
	}
	return Math.sqrt(sum / weight);
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
	for (const row of index.rows) {
		const { f } = row;
		if (f.id === id || Math.abs(f.c - self.f.c) > MAX_GAP) continue;
		const d = distance(index.scale, self, row);
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
	for (const row of index.rows) {
		const { f } = row;
		if (!want(f)) continue;
		let best: { d: number; seed: ChartFeature } | undefined;
		for (const seed of seedRows) {
			if (seed.f.id === f.id) continue;
			if (f.c > seed.f.c + SUGGEST_ABOVE || f.c < seed.f.c - SUGGEST_BELOW)
				continue;
			const d = distance(index.scale, seed, row);
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
