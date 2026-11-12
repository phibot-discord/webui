export const HIGHLIGHT_SECONDS = 30;
export const HIGHLIGHT_LEAD = 1;
export const JUKE_MODES = ["highlight", "whole"] as const;
export type JukeMode = (typeof JUKE_MODES)[number];

export function shuffled<T>(
	items: readonly T[],
	rnd: () => number = Math.random,
): T[] {
	const out = [...items];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.min(i, Math.floor(rnd() * (i + 1)));
		const a = out[i] as T;
		out[i] = out[j] as T;
		out[j] = a;
	}
	return out;
}

export function playRange(
	mode: JukeMode,
	hardestStart: number | null,
	duration: number,
): [from: number, to: number] {
	if (!(duration > 0)) return [0, 0];
	if (mode === "whole" || hardestStart === null) return [0, duration];
	const from = Math.min(
		Math.max(0, hardestStart - HIGHLIGHT_LEAD),
		Math.max(0, duration - HIGHLIGHT_SECONDS - HIGHLIGHT_LEAD),
	);
	return [from, Math.min(duration, from + HIGHLIGHT_LEAD + HIGHLIGHT_SECONDS)];
}

export function isJukeMode(v: unknown): v is JukeMode {
	return (JUKE_MODES as readonly unknown[]).includes(v);
}
