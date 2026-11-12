import { GUESS_STEPS } from "./guess";

export const EAR_SECONDS = [1, 2, 4, 7, 11, 16] as const;
export const EAR_PARAM = "ear";
export const EAR_HEAD_BYTES = 786_432;

export function earSeconds(step: number): number {
	const i = Math.max(
		0,
		Math.min(EAR_SECONDS.length - 1, Math.trunc(step) || 0),
	);
	return EAR_SECONDS[i] ?? 1;
}

export function earAnswerKey(puzzle: string): string {
	return `ear:${puzzle}`;
}

export const EAR_STEPS: number = Math.min(GUESS_STEPS, EAR_SECONDS.length);
