import type { Messages } from "@/i18n/messages";
import { fill } from "@/phi/lib/card-i18n";

export type UnlockCopy = Messages["collection"]["unlock"];

export type UnlockSource = { type: number; info: readonly string[] };

export type TitleOf = (key: string, sub: number) => string | undefined;

const LEVEL_END = /(EZ|HD|IN|AT)$/;
const SCORE_FLOOR = 100_000;

function numeric(value: string | undefined): number | undefined {
	if (!value || !/^\d+$/.test(value.trim())) return undefined;
	return Number(value);
}

function scoreText(n: number): string {
	return n.toLocaleString("en-US");
}

export function splitWords(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\s+/g, " ")
		.trim();
}

function chartOf(info1: string | undefined, copy: UnlockCopy): string {
	const value = info1?.trim();
	if (!value) return "";
	const level = LEVEL_END.exec(value)?.[1];
	if (!level) return value;
	if (value === level) return fill(copy.level, { level });
	return `${value.slice(0, -2)} ${level}`;
}

function flagLabel(flag: string, copy: UnlockCopy): string {
	const match = /^C9(.+?)(Unlocked|Reached)?$/.exec(flag.trim());
	if (!match?.[1]) return splitWords(flag);
	const verb = match[2] === "Reached" ? copy.reached : copy.unlocked;
	return `${splitWords(match[1])} ${match[2] ? verb : ""}`.trim();
}

function pairsOf(text: string): { key: string; sub: number }[] {
	return text
		.split(",")
		.map((part) => /^(.+?)(\d+)$/.exec(part.trim()))
		.flatMap((m) => (m?.[1] && m[2] ? [{ key: m[1], sub: Number(m[2]) }] : []));
}

function rawText(
	info: readonly string[],
	copy: UnlockCopy,
): string | undefined {
	const data = info.map((s) => s.trim()).filter(Boolean);
	return data.length ? fill(copy.raw, { data: data.join(" · ") }) : undefined;
}

export function describeUnlock(
	entry: UnlockSource,
	copy: UnlockCopy,
	titleOf: TitleOf,
): string | undefined {
	const [info1 = "", info2 = "", info3 = ""] = entry.info;
	const scores = [info2, info3]
		.map(numeric)
		.filter((n): n is number => n !== undefined && n >= SCORE_FLOOR);
	const chart = chartOf(info1, copy);
	switch (entry.type) {
		case 0:
		case 2: {
			if (!scores.length) return rawText(entry.info, copy);
			const n = scores.map(scoreText).join(" / ");
			return chart
				? fill(copy.score, { n, chart })
				: fill(copy.scoreOnly, { n });
		}
		case 1: {
			const n = numeric(info2);
			if (n === undefined || n > 100) return rawText(entry.info, copy);
			return fill(copy.accuracy, { n: String(n), chart });
		}
		case 5:
			return info1
				? fill(copy.from, {
						place: splitWords(info1).replace(/^Chapter(\d)/, "Chapter $1"),
					})
				: undefined;
		case 6: {
			const key = info1.trim();
			if (!key) return undefined;
			return fill(copy.after, { items: titleOf(key, 1) ?? key });
		}
		case 7: {
			const flags = info1
				.split(",")
				.map((f) => f.trim())
				.filter(Boolean);
			if (!flags.length) return undefined;
			return fill(copy.flags, {
				items: flags.map((f) => flagLabel(f, copy)).join(", "),
			});
		}
		case 8: {
			const pairs = pairsOf(info1);
			if (!pairs.length) return rawText(entry.info, copy);
			const items = pairs.map(
				(p) => titleOf(p.key, p.sub) ?? `${p.key}#${p.sub}`,
			);
			return fill(copy.after, { items: items.join(", ") });
		}
		default:
			return entry.type >= 0 ? rawText(entry.info, copy) : undefined;
	}
}
