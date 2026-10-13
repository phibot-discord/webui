import { ALL_LEVEL } from "./const";
import { fCompute } from "./fcompute";
import { getInfo } from "./get-info";

export class LevelRecordInfo {
	fc: boolean;
	score: number;
	acc: number;
	id: string;
	rank: string;
	Rating: string;
	rks: number;
	difficulty: number;
	song?: string;
	illustration?: string;
	num?: number | string;
	suggest?: string;
	suggestType?: number;
	accAvg?: string | number;
	accKind?: string;
	cpToOld?: { type: string; dif: string; rks: string };
	date?: Date;

	constructor(
		data: { fc?: boolean | number; score?: number; acc?: number },
		id: string,
		rank: number,
	) {
		this.fc = Boolean(data.fc);
		this.score = data.score || 0;
		this.acc = data.acc || 0;
		this.id = id;
		this.rank = ALL_LEVEL[rank] || String(rank);
		this.Rating = fCompute.rate(this.score, this.fc);
		// Read-only lookup: a save has ~1k records
		const info = getInfo.raw(id);
		if (!info) {
			this.difficulty = 0;
			this.rks = 0;
			return;
		}
		this.song = info.song;
		this.illustration = getInfo.getill(id, "low");
		const difficulty = info.chart?.[this.rank]?.difficulty;
		this.difficulty = difficulty || 0;
		this.rks = difficulty ? fCompute.rks(this.acc, difficulty) : 0;
	}
}
