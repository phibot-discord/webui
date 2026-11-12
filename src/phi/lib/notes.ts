import type { Kv } from "@/server/sdk";
import { isPhiLocale, type PhiLocale } from "./card-i18n";
import {
	type CardStyle,
	DEFAULT_CARD_STYLE,
	type StyledKind,
	sanitizeCardStyles,
} from "./card-styles";
import { kvKey } from "./const";
import { evictOldest } from "./lru";

/** No "b30": phib19 answers it with no figures, so a stored "b30" reads as "all" */
export const B30_AVG_KINDS = ["all", "top", "rank", "none"] as const;
export type B30AvgKind = (typeof B30_AVG_KINDS)[number];

export function isB30AvgKind(v: unknown): v is B30AvgKind {
	return (B30_AVG_KINDS as readonly unknown[]).includes(v);
}

/** "band": players near the user's RKS (±0.05) */
const RANK_SCOPES = ["all", "band", "both"] as const;
export type RankScope = (typeof RANK_SCOPES)[number];

export function isRankScope(v: unknown): v is RankScope {
	return (RANK_SCOPES as readonly unknown[]).includes(v);
}

export function rankScopeOf(notes: Pick<UserNotes, "rankScope">): RankScope {
	return isRankScope(notes.rankScope) ? notes.rankScope : "all";
}

const RANK_BAND_SHOWS = ["place", "percent"] as const;
export type RankBandShow = (typeof RANK_BAND_SHOWS)[number];

export function isRankBandShow(v: unknown): v is RankBandShow {
	return (RANK_BAND_SHOWS as readonly unknown[]).includes(v);
}

export function rankBandShowOf(
	notes: Pick<UserNotes, "rankBandShow">,
): RankBandShow {
	return isRankBandShow(notes.rankBandShow) ? notes.rankBandShow : "place";
}

/** Badge mode; values only the bot knows read as "all" */
export function b30AvgKindOf(notes: Pick<UserNotes, "b30AvgKind">): B30AvgKind {
	return isB30AvgKind(notes.b30AvgKind) ? notes.b30AvgKind : "all";
}

type TaskObj = {
	song: string;
	finished: boolean;
	request: { type: string; rank: string; value: number };
};

export type UserNotes = {
	sign_in: string;
	sign_history: string[];
	task_time: string;
	task: TaskObj[];
	theme: string;
	noticeCode: number;
	b30AvgKind: B30AvgKind | (string & {});
	b30AvgColor: "red" | "gold" | "blue" | "green";
	rankScope?: RankScope;
	rankBandShow?: RankBandShow;
	peerWait?: boolean;
	allowApiUsage: boolean;
	showB30Analysis: boolean;
	showTagAnalysis: boolean;
	showRecordStats: boolean;
	stddevExcludeP3?: boolean;
	cardQuality: "high" | "fast";
	cardBackground?: string;
	cardStyle?: Partial<Record<StyledKind, CardStyle>>;
	locale?: PhiLocale;
};

function defaults(): UserNotes {
	return {
		sign_in: "Wed Apr 03 2024 23:03:52 GMT+0800 (中国标准时间)",
		sign_history: [],
		task_time: "Wed Apr 03 2024 23:03:52 GMT+0800 (中国标准时间)",
		task: [],
		theme: "default",
		noticeCode: 0,
		b30AvgKind: "all",
		b30AvgColor: "blue",
		allowApiUsage: true,
		showB30Analysis: true,
		showTagAnalysis: true,
		showRecordStats: true,
		cardQuality: "fast",
	};
}

export async function getNotes(db: Kv, userId: string): Promise<UserNotes> {
	const raw = await db.get(kvKey("notes", userId));
	const base = defaults();
	if (!raw) return base;
	try {
		const parsed = JSON.parse(raw) as Partial<UserNotes> & { money?: number };
		const { money: _money, ...rest } = parsed;
		return {
			...base,
			...rest,
			sign_history: Array.isArray(rest.sign_history) ? rest.sign_history : [],
			task: Array.isArray(rest.task) ? rest.task : [],
			locale: isPhiLocale(rest.locale) ? rest.locale : undefined,
			cardQuality: rest.cardQuality === "high" ? "high" : "fast",
			cardBackground:
				typeof rest.cardBackground === "string"
					? rest.cardBackground
					: undefined,
			cardStyle: sanitizeCardStyles(rest.cardStyle),
		};
	} catch {
		return base;
	}
}

export async function setNotes(db: Kv, userId: string, notes: UserNotes) {
	const { money: _money, ...rest } = notes as UserNotes & { money?: number };
	await db.set(kvKey("notes", userId), JSON.stringify(rest));
}

const NOTES_QUEUE_MAX = 1_000;
const notesQueue = new Map<string, Promise<unknown>>();

function queued<T>(userId: string, fn: () => Promise<T>): Promise<T> {
	const prev = notesQueue.get(userId) ?? Promise.resolve();
	const next = prev.then(fn, fn);
	const tail: Promise<unknown> = next.then(
		() => undefined,
		() => undefined,
	);
	notesQueue.delete(userId);
	notesQueue.set(userId, tail);
	evictOldest(notesQueue, NOTES_QUEUE_MAX);
	void tail.then(() => {
		if (notesQueue.get(userId) === tail) notesQueue.delete(userId);
	});
	return next;
}

export async function setUserLocale(db: Kv, userId: string, locale: PhiLocale) {
	await queued(userId, async () => {
		const notes = await getNotes(db, userId);
		notes.locale = locale;
		await setNotes(db, userId, notes);
	});
}

export function tagAnalysisEnabled(notes: UserNotes) {
	return notes.showTagAnalysis !== false;
}

export type NotesPatch = {
	showTagAnalysis?: boolean;
	showRecordStats?: boolean;
	stddevExcludeP3?: boolean;
	cardQuality?: "high" | "fast";
	cardBackground?: string;
	cardStyle?: { kind: StyledKind; style: CardStyle };
	b30AvgKind?: B30AvgKind;
	rankScope?: RankScope;
	rankBandShow?: RankBandShow;
	peerWait?: boolean;
	theme?: string;
	b30AvgColor?: UserNotes["b30AvgColor"];
	allowApiUsage?: boolean;
	showB30Analysis?: boolean;
};

export async function patchNotes(
	db: Kv,
	userId: string,
	patch: NotesPatch,
): Promise<void> {
	await queued(userId, async () => {
		const notes = await getNotes(db, userId);
		if (patch.showTagAnalysis !== undefined) {
			notes.showTagAnalysis = patch.showTagAnalysis;
		}
		if (patch.showRecordStats !== undefined) {
			notes.showRecordStats = patch.showRecordStats;
		}
		if (patch.stddevExcludeP3 !== undefined) {
			notes.stddevExcludeP3 = patch.stddevExcludeP3;
		}
		if (patch.cardQuality !== undefined) notes.cardQuality = patch.cardQuality;
		if (patch.cardBackground !== undefined) {
			notes.cardBackground = patch.cardBackground;
		}
		if (patch.cardStyle !== undefined) {
			const { kind, style } = patch.cardStyle;
			const next = { ...notes.cardStyle };
			if (style === DEFAULT_CARD_STYLE) delete next[kind];
			else next[kind] = style;
			notes.cardStyle = Object.keys(next).length ? next : undefined;
		}
		if (patch.b30AvgKind !== undefined) notes.b30AvgKind = patch.b30AvgKind;
		if (patch.rankScope !== undefined) notes.rankScope = patch.rankScope;
		if (patch.rankBandShow !== undefined) {
			notes.rankBandShow = patch.rankBandShow;
		}
		if (patch.peerWait !== undefined) notes.peerWait = patch.peerWait;
		if (patch.theme !== undefined) notes.theme = patch.theme;
		if (patch.b30AvgColor !== undefined) notes.b30AvgColor = patch.b30AvgColor;
		if (patch.allowApiUsage !== undefined) {
			notes.allowApiUsage = patch.allowApiUsage;
		}
		if (patch.showB30Analysis !== undefined) {
			notes.showB30Analysis = patch.showB30Analysis;
		}
		await setNotes(db, userId, notes);
	});
}

export async function setShowTagAnalysis(db: Kv, userId: string, on: boolean) {
	await patchNotes(db, userId, { showTagAnalysis: on });
}

export async function setShowRecordStats(db: Kv, userId: string, on: boolean) {
	await patchNotes(db, userId, { showRecordStats: on });
}

export async function setStddevExcludeP3(db: Kv, userId: string, on: boolean) {
	await patchNotes(db, userId, { stddevExcludeP3: on });
}

export async function setCardQuality(
	db: Kv,
	userId: string,
	cardQuality: "high" | "fast",
) {
	await patchNotes(db, userId, { cardQuality });
}

export async function setB30AvgKind(db: Kv, userId: string, kind: B30AvgKind) {
	await patchNotes(db, userId, { b30AvgKind: kind });
}

export async function setRankScope(db: Kv, userId: string, scope: RankScope) {
	await patchNotes(db, userId, { rankScope: scope });
}

export async function setRankBandShow(
	db: Kv,
	userId: string,
	show: RankBandShow,
) {
	await patchNotes(db, userId, { rankBandShow: show });
}

export async function setPeerWait(db: Kv, userId: string, on: boolean) {
	await patchNotes(db, userId, { peerWait: on });
}

export async function setCardBackground(
	db: Kv,
	userId: string,
	cardBackground: string,
) {
	await patchNotes(db, userId, { cardBackground });
}

export async function setCardStyle(
	db: Kv,
	userId: string,
	kind: StyledKind,
	style: CardStyle,
) {
	await patchNotes(db, userId, { cardStyle: { kind, style } });
}
