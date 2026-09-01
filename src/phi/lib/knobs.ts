import { PHI_CSS } from "../css/bundle";

export function knobs(): Map<string, string> {
	const css = PHI_CSS["knobs.css"] || "";
	const map = new Map<string, string>();
	for (const block of css.matchAll(/(?::root|html)\s*\{([^{}]*)\}/gi)) {
		const body = block[1];
		if (!body) continue;
		for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
			const name = m[1];
			const value = m[2];
			if (!name || !value) continue;
			map.set(`--${name}`, value.trim());
		}
	}
	return map;
}

export function knob(name: string, fallback: string): string {
	return knobs().get(name) ?? fallback;
}

export function knobNum(name: string, fallback: number): number {
	const n = parseFloat(knob(name, String(fallback)));
	return Number.isFinite(n) ? n : fallback;
}
