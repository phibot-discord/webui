import { collectRootVars } from "@/server/render/css";
import { PHI_CSS } from "../css/bundle";

let parsed: Map<string, string> | undefined;

function knobs(): Map<string, string> {
	parsed ??= collectRootVars(PHI_CSS["knobs.css"] || "");
	return parsed;
}

function knob(name: string, fallback: string): string {
	return knobs().get(name) ?? fallback;
}

export function knobNum(name: string, fallback: number): number {
	const n = parseFloat(knob(name, String(fallback)));
	return Number.isFinite(n) ? n : fallback;
}
