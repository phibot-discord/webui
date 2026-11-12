export const REVIEW_YEAR = 2026;
export const FIRST_REVIEW_YEAR = 2026;
export const REVIEW_OPENS = `${REVIEW_YEAR}-12-01`;

const RECAP = /^(\d{4})-recap$/;

export function reviewPath(year: number): string {
	return `/${year}-recap`;
}

export const REVIEW_PATH = reviewPath(REVIEW_YEAR);

export function recapYear(slug: string): number | null {
	const year = Number(RECAP.exec(slug)?.[1]);
	return year >= FIRST_REVIEW_YEAR && year <= REVIEW_YEAR ? year : null;
}

export type ReviewPhase = "soon" | "open" | "complete" | "unlinked";
export type ReviewEnv = {
	PHI_REVIEW_EARLY?: string;
	VERCEL_ENV?: string;
	NODE_ENV?: string;
};

const YEAR = /^\d{4}$/;
const chinaMidnight = (day: string) => Date.parse(`${day}T00:00:00+08:00`);
const OPENS_AT = chinaMidnight(REVIEW_OPENS);
const COMPLETE_AT = chinaMidnight(`${REVIEW_YEAR + 1}-01-01`);
const UNLINKED_AT = chinaMidnight(`${REVIEW_YEAR + 1}-02-01`);

export function reviewWindow(now: number, env: ReviewEnv = {}): ReviewPhase {
	if (now >= UNLINKED_AT) return "unlinked";
	if (now >= COMPLETE_AT) return "complete";
	if (now >= OPENS_AT) return "open";
	return earlyAllowed(env) ? "open" : "soon";
}

function earlyAllowed(env: ReviewEnv): boolean {
	if (env.VERCEL_ENV === "production") return false;
	if (env.NODE_ENV === "development") return true;
	return env.PHI_REVIEW_EARLY === "1" && env.VERCEL_ENV === "preview";
}

export function reviewLinked(phase: ReviewPhase): boolean {
	return phase === "open" || phase === "complete";
}

export function reviewYear(raw: string | null): number {
	if (raw === null || !YEAR.test(raw)) return REVIEW_YEAR;
	const year = Number(raw);
	return year >= FIRST_REVIEW_YEAR && year <= REVIEW_YEAR ? year : REVIEW_YEAR;
}
