export type RefreshRecord = {
	id: string;
	rank: string;
	acc: number;
	score: number;
	fc: boolean;
};

export type RefreshSide = {
	rev: string;
	rks: number | null;
	records: readonly RefreshRecord[];
};

export type RefreshSummary =
	| { kind: "same" }
	| {
			kind: "changed";
			rks: [before: number | null, after: number | null];
			charts: number;
			fc: number;
			ap: number;
	  };

const AP_SCORE = 1_000_000;

export function refreshSummary(
	before: RefreshSide | null | undefined,
	after: RefreshSide,
): RefreshSummary | null {
	if (!before) return null;
	if (before.rev && before.rev === after.rev) return { kind: "same" };
	const old = new Map(before.records.map((r) => [`${r.id}:${r.rank}`, r]));
	let charts = 0;
	let fc = 0;
	let ap = 0;
	for (const now of after.records) {
		const was = old.get(`${now.id}:${now.rank}`);
		const better =
			!was || now.score > was.score || now.acc > was.acc || (now.fc && !was.fc);
		if (!better) continue;
		charts++;
		if (now.fc && !was?.fc) fc++;
		if (now.score >= AP_SCORE && !(was && was.score >= AP_SCORE)) ap++;
	}
	return { kind: "changed", rks: [before.rks, after.rks], charts, fc, ap };
}
