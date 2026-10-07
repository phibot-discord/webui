import type { Kv } from "@/server/sdk";
import { isPhiLocale, type PhiLocale } from "./card-i18n";
import {
	type CardStyle,
	DEFAULT_CARD_STYLE,
	type StyledKind,
	sanitizeCardStyles,
} from "./card-styles";
import { kvKey } from "./const";

/** Badge on each B30 row: peer averages, phib19 percentiles, phib19 rank, or nothing */
export const B30_AVG_KINDS = ["all", "b30", "top", "rank", "none"] as const;
export type B30AvgKind = (typeof B30_AVG_KINDS)[number];

export function isB30AvgKind(v: unknown): v is B30AvgKind {
	return (B30_AVG_KINDS as readonly unknown[]).includes(v);
}

/** Badge mode; values only the bot knows read as "all" */
export function b30AvgKindOf(notes: Pick<UserNotes, "b30AvgKind">): B30AvgKind {
	return isB30AvgKind(notes.b30AvgKind) ? notes.b30AvgKind : "all";
}

export type TaskObj = {
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
	/** Read through b30AvgKindOf: the Discord bot may have stored another string */
	b30AvgKind: B30AvgKind | (string & {});
	b30AvgColor: "red" | "gold" | "blue" | "green";
	allowApiUsage: boolean;
	showB30Analysis: boolean;
	showTagAnalysis: boolean;
	showRecordStats: boolean;
	cardQuality: "high" | "fast";
	/** Illustration id. Empty or missing keeps a random background */
	cardBackground?: string;
	/** Layout per card kind. Missing kinds use the classic layout */
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

export async function setUserLocale(db: Kv, userId: string, locale: PhiLocale) {
	const notes = await getNotes(db, userId);
	notes.locale = locale;
	await setNotes(db, userId, notes);
}

export function tagAnalysisEnabled(notes: UserNotes) {
	return notes.showTagAnalysis !== false && notes.allowApiUsage !== false;
}

export async function setShowTagAnalysis(db: Kv, userId: string, on: boolean) {
	const notes = await getNotes(db, userId);
	notes.showTagAnalysis = on;
	await setNotes(db, userId, notes);
}

export async function setShowRecordStats(db: Kv, userId: string, on: boolean) {
	const notes = await getNotes(db, userId);
	notes.showRecordStats = on;
	await setNotes(db, userId, notes);
}

export async function setCardQuality(
	db: Kv,
	userId: string,
	cardQuality: "high" | "fast",
) {
	const notes = await getNotes(db, userId);
	notes.cardQuality = cardQuality;
	await setNotes(db, userId, notes);
}

export async function setB30AvgKind(db: Kv, userId: string, kind: B30AvgKind) {
	const notes = await getNotes(db, userId);
	notes.b30AvgKind = kind;
	await setNotes(db, userId, notes);
}

export async function setCardBackground(
	db: Kv,
	userId: string,
	cardBackground: string,
) {
	const notes = await getNotes(db, userId);
	notes.cardBackground = cardBackground;
	await setNotes(db, userId, notes);
}

export async function setCardStyle(
	db: Kv,
	userId: string,
	kind: StyledKind,
	style: CardStyle,
) {
	const notes = await getNotes(db, userId);
	const next = { ...notes.cardStyle };
	if (style === DEFAULT_CARD_STYLE) delete next[kind];
	else next[kind] = style;
	notes.cardStyle = Object.keys(next).length ? next : undefined;
	await setNotes(db, userId, notes);
}
