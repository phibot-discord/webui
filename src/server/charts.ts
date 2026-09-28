import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { getInfo } from "@/phi/lib/get-info";
import { catalogRevision, ensureSongInfo } from "./song-info";

export type ChartCell = [number, number | null];
export type ChartSummary = {
	id: string;
	song: string;
	composer: string;
	charts: Partial<Record<LevelKind, ChartCell>>;
};

type Snapshot = {
	rev: string;
	list: ChartSummary[];
	json: string;
	etag: string;
};

let snapshot: Snapshot | undefined;

function build(): ChartSummary[] {
	const out: ChartSummary[] = [];
	for (const song of [
		...Object.values(getInfo.ori_info),
		...Object.values(getInfo.sp_info),
	]) {
		const charts: ChartSummary["charts"] = {};
		let any = false;
		for (const level of LEVEL) {
			const chart = song.chart?.[level];
			const difficulty = Number(chart?.difficulty);
			if (!chart || !Number.isFinite(difficulty) || difficulty <= 0) continue;
			const notes = Number(chart.combo);
			charts[level] = [
				difficulty,
				Number.isInteger(notes) && notes > 0 ? notes : null,
			];
			any = true;
		}
		if (!any) continue;
		out.push({
			id: song.id,
			song: song.song,
			composer: song.composer || "",
			charts,
		});
	}
	return out;
}

export async function chartCatalog(): Promise<Snapshot> {
	await ensureSongInfo();
	const rev = catalogRevision();
	if (snapshot?.rev === rev) return snapshot;
	const list = build();
	const json = JSON.stringify(list);
	snapshot = {
		rev,
		list,
		json,
		etag: `"charts-${rev.replace(/[^\w:.-]/g, "_")}-${list.length}"`,
	};
	return snapshot;
}

export function chartCell(id: string, rank: string): ChartCell | undefined {
	const song =
		getInfo.ori_info[id] ??
		getInfo.sp_info[id] ??
		getInfo.ori_info[`${id}.0`] ??
		getInfo.sp_info[`${id}.0`];
	const chart = song?.chart?.[rank];
	const difficulty = Number(chart?.difficulty);
	if (!chart || !Number.isFinite(difficulty) || difficulty <= 0) return;
	const notes = Number(chart.combo);
	return [difficulty, Number.isInteger(notes) && notes > 0 ? notes : null];
}
