import { bareId } from "@/lib/chart-catalog";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import type { ObjectUrl } from "./asset-links";
import type { ChartSummary } from "./charts";
import { illKey } from "./ill";

export type TierItem = {
	key: string;
	id: string;
	rank: LevelKind;
	c: number;
	title: string;
	jacket?: string;
};

export function tierLevels(
	list: readonly ChartSummary[],
): { level: number; count: number }[] {
	const counts = new Map<number, number>();
	for (const song of list) {
		for (const rank of LEVEL) {
			const c = song.charts[rank]?.[0] ?? 0;
			if (c > 0)
				counts.set(Math.floor(c), (counts.get(Math.floor(c)) ?? 0) + 1);
		}
	}
	return [...counts]
		.map(([level, count]) => ({ level, count }))
		.sort((a, b) => b.level - a.level);
}

export function tierItems(
	list: readonly ChartSummary[],
	level: number,
	links: ObjectUrl,
): TierItem[] {
	const out: TierItem[] = [];
	for (const song of list) {
		let jacket: string | undefined;
		let asked = false;
		for (const rank of LEVEL) {
			const c = song.charts[rank]?.[0] ?? 0;
			if (!(c > 0) || Math.floor(c) !== level) continue;
			if (!asked) {
				jacket = links(illKey(bareId(song.id), "low"));
				asked = true;
			}
			out.push({
				key: `${song.id}:${rank}`,
				id: song.id,
				rank,
				c,
				title: song.song,
				...(jacket ? { jacket } : {}),
			});
		}
	}
	return out.sort(
		(a, b) => b.c - a.c || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
	);
}

export function pickLevel(
	levels: readonly { level: number; count: number }[],
	raw: string | undefined,
): number | undefined {
	const asked = Number(raw);
	if (Number.isInteger(asked) && levels.some((l) => l.level === asked))
		return asked;
	return levels.find((l) => l.count >= 10)?.level ?? levels[0]?.level;
}
