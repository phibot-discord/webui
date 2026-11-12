import { readLocal } from "@/lib/local-store";

export type PlayerModule = typeof import("./player");

export const VOLUME_KEY = "webChartHitVolume";
export const MIX_KEY = "webChartHitMix";
export const CHORD_KEY = "webChartChordColors";
export const NOISE_KEY = "webChartNoise";
export const SIZE_KEY = "webChartNoteSize";
export const VOLUME_MAX = 1.5;
export const SIZE_MIN = 0.6;
export const SIZE_MAX = 1.5;

let moduleJob: Promise<PlayerModule> | null = null;
let loadedModule: PlayerModule | null = null;

export function playerModule(): Promise<PlayerModule> {
	if (!moduleJob) {
		moduleJob = import("./player").then((mod) => {
			loadedModule = mod;
			return mod;
		});
		moduleJob.catch(() => {
			moduleJob = null;
		});
	}
	return moduleJob;
}

export function loadedPlayerModule(): PlayerModule | null {
	return loadedModule;
}

export function bounded(
	raw: string | null | undefined,
	min: number,
	max: number,
): number | null {
	if (raw === null || raw === "") return null;
	const n = Number(raw);
	return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : null;
}

export function storedNumber(
	key: string,
	min: number,
	max: number,
): number | null {
	return bounded(readLocal(key), min, max);
}

export function storedMix(): number[] | null {
	const raw = readLocal(MIX_KEY);
	if (!raw) return null;
	const parts = raw.split(",").map((p) => bounded(p, 0, 1));
	return parts.length === 3 && parts.every((p) => p !== null)
		? (parts as number[])
		: null;
}
