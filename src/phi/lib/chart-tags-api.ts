import {
	type B30Record,
	buildTagAnalysis,
	type ChartTagTreeNode,
	type ChartTagVotes,
} from "./b30-analysis";
import { PHI_CHART_TAG_API } from "./const";

type TreeBody = { data?: unknown };
type BatchBody = { data?: ChartTagVotes };

const TREE_TTL_MS = 6 * 60 * 60 * 1000;
let treeCache: { at: number; value: Promise<ChartTagTreeNode[]> } | null = null;

async function jsonFetch(path: string, init: RequestInit = {}) {
	const res = await fetch(`${PHI_CHART_TAG_API}${path}`, {
		...init,
		signal: init.signal ?? AbortSignal.timeout(15_000),
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...init.headers,
		},
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`chart-tag ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`,
		);
	}
	return res.json();
}

function apiSongId(id: string) {
	return id.endsWith(".0") ? id : `${id}.0`;
}

function asTree(raw: unknown): ChartTagTreeNode[] {
	if (!Array.isArray(raw)) return [];
	return raw.flatMap((item) => {
		if (!item || typeof item !== "object") return [];
		const node = item as {
			name?: unknown;
			voteCount?: unknown;
			children?: unknown;
		};
		if (typeof node.name !== "string" || !node.name) return [];
		return [
			{
				name: node.name,
				voteCount:
					typeof node.voteCount === "number" ? node.voteCount : undefined,
				children: asTree(node.children),
			},
		];
	});
}

export async function loadChartTagTree(): Promise<ChartTagTreeNode[]> {
	const now = Date.now();
	if (treeCache && now - treeCache.at < TREE_TTL_MS) return treeCache.value;
	const value = jsonFetch("/chartsTag/get/tagTree")
		.then((body: TreeBody) => {
			const tree = asTree(body?.data ?? body);
			if (!tree.length) throw new Error("empty chart-tag tree");
			return tree;
		})
		.catch((err) => {
			if (treeCache?.value === value) treeCache = null;
			throw err;
		});
	treeCache = { at: now, value };
	return value;
}

export async function loadChartTagVotes(
	records: Array<{ id: string; rank: string }>,
): Promise<ChartTagVotes> {
	const seen = new Set<string>();
	const unique: { id: string; rank: string; apiId: string }[] = [];
	for (const record of records) {
		const apiId = apiSongId(record.id);
		const key = `${apiId}\0${record.rank}`;
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push({ id: record.id, rank: record.rank, apiId });
	}
	if (!unique.length) return {};
	try {
		const body = (await jsonFetch("/chartsTag/get/chartsTags", {
			method: "POST",
			body: JSON.stringify({
				data: unique.map((row) => ({
					song_id: row.apiId,
					rank: [row.rank],
				})),
			}),
		})) as BatchBody;
		return pickVotes(unique, body?.data);
	} catch {
		return loadChartTagVotesEach(unique);
	}
}

function pickVotes(
	rows: Array<{ id: string; rank: string; apiId: string }>,
	raw: ChartTagVotes | undefined,
): ChartTagVotes {
	const out: ChartTagVotes = {};
	if (!raw || typeof raw !== "object") return out;
	for (const row of rows) {
		const votes =
			raw[row.apiId]?.[row.rank] || raw[row.id]?.[row.rank] || undefined;
		if (!votes) continue;
		out[row.id] ||= {};
		out[row.id]![row.rank] = votes;
		if (row.apiId !== row.id) {
			out[row.apiId] ||= {};
			out[row.apiId]![row.rank] = votes;
		}
	}
	return out;
}

async function loadChartTagVotesEach(
	rows: Array<{ id: string; rank: string; apiId: string }>,
): Promise<ChartTagVotes> {
	const out: ChartTagVotes = {};
	const chunk = 6;
	for (let i = 0; i < rows.length; i += chunk) {
		await Promise.all(
			rows.slice(i, i + chunk).map(async (row) => {
				try {
					const body = (await jsonFetch("/chartsTag/get/bySongRank", {
						method: "POST",
						body: JSON.stringify({
							song_id: row.apiId,
							rank: row.rank,
						}),
					})) as { data?: Record<string, number> };
					const votes = body?.data;
					if (!votes || typeof votes !== "object") return;
					out[row.id] ||= {};
					out[row.id]![row.rank] = votes;
					if (row.apiId !== row.id) {
						out[row.apiId] ||= {};
						out[row.apiId]![row.rank] = votes;
					}
				} catch {
					/* unknown chart ids are skipped */
				}
			}),
		);
	}
	return out;
}

export async function tagAnalysisFor(records: B30Record[]) {
	const [tree, votes] = await Promise.all([
		loadChartTagTree(),
		loadChartTagVotes(records),
	]);
	return buildTagAnalysis(records, tree, votes);
}
