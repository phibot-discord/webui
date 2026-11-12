import type { WrappedDay } from "./wrapped";

export type ReplayMark = {
	kind: "jump" | "ap" | "fc" | "step";
	day: string;
	label: string;
	value: string;
	sub: string;
	big: string;
	acc?: { before: number | null; after: number };
	jacket?: string;
};

export type ReplayInput = {
	first: string;
	last: string;
	days: WrappedDay[];
	rks: { day: string; value: number }[];
	startRks: number | null;
	marks: ReplayMark[];
};

export type DeckCard =
	| "cover"
	| "days"
	| "rks"
	| "charts"
	| "ap"
	| "fc"
	| "jump"
	| "step"
	| "type"
	| "end";

const MARK_CARDS = ["ap", "fc", "jump", "step"] as const;

const TILE_CARDS: readonly DeckCard[] = [
	"rks",
	"charts",
	"charts",
	"days",
	"ap",
	"fc",
	"jump",
	"step",
];

const DAY_MS = 86_400_000;

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / DAY_MS;

const whole = (value: string | undefined) =>
	value !== undefined && /^\d+$/.test(value) ? Number(value) : 0;

export function deckCards(input: {
	replay: ReplayInput;
	tiles: readonly { value: string }[];
	hasType: boolean;
}): DeckCard[] {
	const { replay, tiles, hasType } = input;
	const marks = new Set(replay.marks.map((m) => m.kind));
	const cards: DeckCard[] = ["cover", "days"];
	if (replay.rks.length > 0) cards.push("rks");
	if (whole(tiles[1]?.value) + whole(tiles[2]?.value) > 0) cards.push("charts");
	for (const kind of MARK_CARDS) if (marks.has(kind)) cards.push(kind);
	if (hasType) cards.push("type");
	cards.push("end");
	return cards;
}

export function tileCard(index: number): DeckCard | null {
	return Number.isInteger(index) ? (TILE_CARDS[index] ?? null) : null;
}

export function calendarMonths(
	replay: Pick<ReplayInput, "first" | "last" | "days">,
): { year: number; month: number; days: (WrappedDay & { dom: number })[] }[] {
	const months: {
		year: number;
		month: number;
		days: (WrappedDay & { dom: number })[];
	}[] = [];
	let year = Number(replay.first.slice(0, 4));
	let month = Number(replay.first.slice(5, 7));
	const lastYear = Number(replay.last.slice(0, 4));
	const lastMonth = Number(replay.last.slice(5, 7));
	if (![year, month, lastYear, lastMonth].every(Number.isFinite)) return [];
	while (year < lastYear || (year === lastYear && month <= lastMonth)) {
		months.push({ year, month, days: [] });
		month += 1;
		if (month > 12) {
			month = 1;
			year += 1;
		}
	}
	const byKey = new Map(months.map((m) => [`${m.year}-${m.month}`, m]));
	for (const day of replay.days) {
		const entry = byKey.get(
			`${Number(day.day.slice(0, 4))}-${Number(day.day.slice(5, 7))}`,
		);
		if (entry) entry.days.push({ ...day, dom: Number(day.day.slice(8, 10)) });
	}
	for (const entry of months) entry.days.sort((a, b) => a.dom - b.dom);
	return months;
}

export function sparkPoints(
	replay: Pick<ReplayInput, "first" | "last" | "rks" | "startRks">,
	width: number,
	height: number,
): { points: [number, number][]; start: number | null; end: number } | null {
	const readings = [...replay.rks].sort((a, b) =>
		a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
	);
	const last = readings.at(-1);
	if (!last) return null;
	const from = dayNumber(replay.first);
	const span = dayNumber(replay.last) - from;
	const x = (day: string) =>
		span > 0
			? Math.min(1, Math.max(0, (dayNumber(day) - from) / span)) * width
			: width;
	const values = [
		...(replay.startRks !== null ? [replay.startRks] : []),
		...readings.map((r) => r.value),
	];
	const low = Math.min(...values);
	const high = Math.max(...values);
	const y = (value: number) =>
		high > low ? ((high - value) / (high - low)) * height : height / 2;
	const points: [number, number][] = [];
	if (replay.startRks !== null) points.push([0, y(replay.startRks)]);
	for (const r of readings) points.push([x(r.day), y(r.value)]);
	return { points, start: replay.startRks, end: last.value };
}
