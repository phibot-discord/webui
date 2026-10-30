export const GUESS_STEPS = 6;
export const GUESS_TZ = "Asia/Shanghai";

const DAILY = /^d-(\d{4})-(\d{2})-(\d{2})$/;
const PRACTICE = /^p-[A-Za-z0-9_-]{12,24}$/;

export type PuzzleKind = "daily" | "practice";

export function dayKey(at: Date = new Date()): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: GUESS_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(at);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
	return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dailyId(day: string = dayKey()): string {
	return `d-${day}`;
}

export function puzzleKind(
	id: string,
	today: string = dayKey(),
): PuzzleKind | undefined {
	const daily = id.match(DAILY);
	if (daily) {
		const day = `${daily[1]}-${daily[2]}-${daily[3]}`;
		const valid = !Number.isNaN(Date.parse(`${day}T00:00:00Z`));
		return valid && day <= today ? "daily" : undefined;
	}
	return PRACTICE.test(id) ? "practice" : undefined;
}

export function practiceId(random: (n: number) => Uint8Array): string {
	const bytes = random(12);
	const alphabet =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	let out = "";
	for (const b of bytes) out += alphabet[b & 63];
	return `p-${out}`;
}

export function clampStep(raw: unknown): number {
	const n = Math.trunc(Number(raw));
	return Number.isFinite(n) ? Math.max(0, Math.min(GUESS_STEPS - 1, n)) : 0;
}

export function shareText(opts: {
	label: string;
	tries: number;
	won: boolean;
	url: string;
}): string {
	const misses = Math.max(0, opts.won ? opts.tries - 1 : opts.tries);
	const marks =
		[
			...Array.from({ length: misses }, () => "×"),
			...(opts.won ? ["●"] : []),
		].join(" ") || "—";
	return `${opts.label} · ${opts.won ? opts.tries : "X"}/${GUESS_STEPS}\n${marks}\n${opts.url}`;
}
