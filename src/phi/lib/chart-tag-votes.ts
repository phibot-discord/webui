import { logger } from "@/server/logger";
import type { ChartTagTreeNode } from "./b30-analysis";

export const CHART_TAG_VOTES_SOURCE = "https://kyou.net.cn/phigros";
const TTL_MS = 30 * 60_000;
const RETRY_MS = 5 * 60_000;

export type TagCategory = { id: number; name: string };

export type TagVotes = {
	sha: string;
	fetchedAt?: string;
	tree: ChartTagTreeNode[];
	categories: TagCategory[];
	tags: Map<number, { name: string; parents: number[] }>;
	charts: Map<string, Map<number, number>>;
};

export function chartTagVotesR2Key(
	prefix = process.env.CLOUDFLARE_R2_INFO_PREFIX ?? "info",
) {
	return `${prefix.replace(/\/+$/, "")}/chartTags.json`;
}

export function chartVoteKey(id: string, level: string): string {
	return `${id.replace(/\.0$/, "")}|${level}`;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function int(value: unknown): number | undefined {
	const n = Number(value);
	return typeof value !== "boolean" && Number.isInteger(n) ? n : undefined;
}

export function parseTagVotes(raw: unknown): TagVotes {
	if (!isRecord(raw) || !Array.isArray(raw.tree) || !isRecord(raw.charts))
		throw new Error("chartTags.json: unexpected shape");
	const categories: TagCategory[] = [];
	const tags: TagVotes["tags"] = new Map();
	const tree: ChartTagTreeNode[] = [];
	for (const node of raw.tree) {
		if (!isRecord(node)) continue;
		const id = int(node.id);
		const name = text(node.name);
		if (id === undefined || !name) continue;
		const children: ChartTagTreeNode[] = [];
		for (const child of Array.isArray(node.children) ? node.children : []) {
			if (!isRecord(child)) continue;
			const tagId = int(child.id);
			const tagName = text(child.name);
			if (tagId === undefined || !tagName) continue;
			const known = tags.get(tagId);
			if (known) known.parents.push(id);
			else tags.set(tagId, { name: tagName, parents: [id] });
			children.push({
				name: tagName,
				description: text(child.description),
				children: [],
			});
		}
		categories.push({ id, name });
		tree.push({ name, description: text(node.description), children });
	}
	if (!categories.length || !tags.size)
		throw new Error("chartTags.json: no tags");
	const charts: TagVotes["charts"] = new Map();
	for (const [id, entry] of Object.entries(raw.charts)) {
		if (!isRecord(entry) || !isRecord(entry.votes)) continue;
		for (const [level, row] of Object.entries(entry.votes)) {
			if (!isRecord(row)) continue;
			const votes = new Map<number, number>();
			for (const [tag, n] of Object.entries(row)) {
				const tagId = int(tag);
				const count = Number(n);
				if (tagId === undefined || !tags.has(tagId)) continue;
				if (Number.isFinite(count) && count > 0) votes.set(tagId, count);
			}
			if (votes.size) charts.set(chartVoteKey(id, level), votes);
		}
	}
	return {
		sha: text(raw.sha) ?? "",
		fetchedAt: text(raw.fetchedAt),
		tree,
		categories,
		tags,
		charts,
	};
}

type Slot = {
	value?: TagVotes;
	at: number;
	retryAt: number;
	job?: Promise<TagVotes | undefined>;
};

const g = globalThis as typeof globalThis & { __phiTagVotes?: Slot };
function slot(): Slot {
	g.__phiTagVotes ??= { at: 0, retryAt: 0 };
	return g.__phiTagVotes;
}

export type TagVotesDeps = {
	read: () => Promise<Buffer | undefined>;
	now: () => number;
};

const defaultDeps: TagVotesDeps = {
	read: async () => {
		const { fetchR2Object } = await import("@/server/r2");
		return fetchR2Object(chartTagVotesR2Key(), {
			cache: "no-store",
			negative: false,
		});
	},
	now: Date.now,
};

export function resetTagVotesForTest() {
	g.__phiTagVotes = undefined;
}

async function refresh(deps: TagVotesDeps): Promise<TagVotes | undefined> {
	const st = slot();
	try {
		const buf = await deps.read();
		if (!buf?.byteLength) throw new Error("chartTags.json missing");
		const value = parseTagVotes(JSON.parse(buf.toString("utf8")));
		if (value.sha !== st.value?.sha)
			logger.info(
				`chart-tag votes ${value.sha.slice(0, 12)} ${value.charts.size} charts from ${value.fetchedAt ?? "?"}`,
			);
		st.value = value;
		st.at = deps.now();
		st.retryAt = 0;
	} catch (err) {
		st.retryAt = deps.now() + RETRY_MS;
		logger.warn(
			`chart-tag votes kept/skipped: ${err instanceof Error ? err.message : err}`,
		);
	}
	return st.value;
}

export async function loadTagVotes(
	deps: TagVotesDeps = defaultDeps,
): Promise<TagVotes | undefined> {
	const st = slot();
	const now = deps.now();
	const fresh = st.value && now - st.at < TTL_MS;
	if (fresh || (st.retryAt && now < st.retryAt)) return st.value;
	if (!st.job) {
		const job = refresh(deps).finally(() => {
			if (st.job === job) st.job = undefined;
		});
		st.job = job;
	}
	return st.value ?? st.job;
}
