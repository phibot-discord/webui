import type { TagVotes } from "@/phi/lib/chart-tag-votes";
import { fCompute } from "@/phi/lib/fcompute";
import { type ProfileRecord, tagProfileDetail } from "@/phi/lib/tag-profile";

export type FormTarget = {
	id: string;
	rank: string;
	c: number;
	acc: number;
	expected: number;
	gain: number;
	weak: string[];
};

const BEST_SLOTS = 27;
const SLOTS = 30;
const FORM_MAX = 15;
const EPS = 1e-6;

export function formTargets(
	records: readonly ProfileRecord[],
	votes: TagVotes,
	limit = FORM_MAX,
): FormTarget[] {
	const detail = tagProfileDetail(records, votes);
	if (detail.analysis.insufficient) return [];
	const key = (id: string, level: string) => `${id}\u0000${level}`;
	const best = [...records]
		.filter((r) => Number.isFinite(r.rks))
		.sort((a, b) => b.rks - a.rks)
		.slice(0, BEST_SLOTS);
	const inBest = new Set(best.map((r) => key(r.id, r.level)));
	const floor = best.length < BEST_SLOTS ? 0 : (best.at(-1)?.rks ?? 0);
	const weakTags = new Set(
		detail.analysis.tags.filter((t) => t.side === "weak").map((t) => t.name),
	);
	const weakOf = new Map<number, string[]>();
	for (const [name, uses] of detail.byTag) {
		if (!weakTags.has(name)) continue;
		for (const u of uses) {
			const list = weakOf.get(u.chart) ?? [];
			list.push(name);
			weakOf.set(u.chart, list);
		}
	}
	const out: FormTarget[] = [];
	detail.charts.forEach((pc, i) => {
		if (!(pc.expected > pc.acc + EPS)) return;
		const target = fCompute.rks(pc.expected, pc.difficulty);
		const base = inBest.has(key(pc.id, pc.level)) ? pc.rks : floor;
		const gain = (target - base) / SLOTS;
		if (!(gain > EPS)) return;
		out.push({
			id: pc.id,
			rank: pc.level,
			c: pc.difficulty,
			acc: pc.acc,
			expected: pc.expected,
			gain,
			weak: weakOf.get(i) ?? [],
		});
	});
	return out
		.sort(
			(a, b) =>
				b.gain - a.gain ||
				b.c - a.c ||
				(a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
		)
		.slice(0, limit);
}
