import { LEVEL, type LevelKind } from "@/phi/lib/const";

export const DARE_PARAM = "dare";
export const DARE_DAYS = 30;
const DAY_MS = 86_400_000;
const NAME_MAX = 40;
const STATUSES = ["none", "fc", "ap"] as const;
export type DareStatus = (typeof STATUSES)[number];

export type Dare = {
	rank: LevelKind;
	acc: number;
	status: DareStatus;
	name: string;
	until: number;
};

const dayOf = (ms: number) => Math.floor(ms / DAY_MS);

export function dareUntil(now: number): number {
	return dayOf(now) + DARE_DAYS;
}

export function dareExpired(until: number, now: number): boolean {
	return dayOf(now) > until;
}

const toBase64Url = (text: string) =>
	btoa(String.fromCharCode(...new TextEncoder().encode(text)))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");

function fromBase64Url(raw: string): string | undefined {
	if (!/^[A-Za-z0-9_-]*$/.test(raw)) return undefined;
	try {
		const bin = atob(raw.replaceAll("-", "+").replaceAll("_", "/"));
		return new TextDecoder("utf-8", { fatal: true }).decode(
			Uint8Array.from(bin, (ch) => ch.charCodeAt(0)),
		);
	} catch {
		return undefined;
	}
}

export function dareName(raw: string): string {
	return [...raw.trim()].slice(0, NAME_MAX).join("");
}

export function dareAcc(acc: number): number {
	return Math.min(10_000, Math.max(0, Math.floor(acc * 100 + 1e-6))) / 100;
}

export function encodeDare(dare: Dare): string {
	return [
		"1",
		dare.rank,
		String(Math.round(dareAcc(dare.acc) * 100)),
		String(STATUSES.indexOf(dare.status)),
		String(dare.until),
		toBase64Url(dareName(dare.name)),
	].join(".");
}

export function decodeDare(payload: string): Dare | undefined {
	const parts = payload.split(".");
	if (parts.length !== 6 || parts[0] !== "1") return undefined;
	const [, rank, hundredths, flag, untilRaw, nameRaw] = parts;
	if (!(LEVEL as readonly string[]).includes(rank ?? "")) return undefined;
	if (!/^\d{1,5}$/.test(hundredths ?? "") || !/^[0-2]$/.test(flag ?? ""))
		return undefined;
	if (!/^\d{1,6}$/.test(untilRaw ?? "")) return undefined;
	const acc = Number(hundredths) / 100;
	if (acc > 100) return undefined;
	const name = fromBase64Url(nameRaw ?? "");
	if (name === undefined || [...name].length > NAME_MAX) return undefined;
	return {
		rank: rank as LevelKind,
		acc,
		status: STATUSES[Number(flag)] ?? "none",
		name,
		until: Number(untilRaw),
	};
}

export function dareGap(theirs: number, yours: number): number {
	return Math.round((yours - theirs) * 100) / 100;
}
