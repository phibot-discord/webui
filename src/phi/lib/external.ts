export type CardPhase = "phib19" | "render";

export type CardMissing = "peers" | "tags" | "song" | "stale" | "empty";

/** Lookups answered from memory settle within this; only a slower one counts as waiting */
const WAIT_SIGNAL_MS = 300;

/** Times a card's parallel phib19.top lookups; `onWait(true)` once one runs past WAIT_SIGNAL_MS, `onWait(false)` when the last settles */
export function watchExternal(onWait?: (waiting: boolean) => void) {
	let pending = 0;
	let started: number | undefined;
	let ended: number | undefined;
	let waiting = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const settle = () => {
		pending--;
		ended = performance.now();
		if (pending > 0) return;
		clearTimeout(timer);
		if (waiting) {
			waiting = false;
			onWait?.(false);
		}
	};
	return {
		track<T>(job: Promise<T>): Promise<T> {
			pending++;
			started ??= performance.now();
			if (pending === 1 && !waiting) {
				clearTimeout(timer);
				timer = setTimeout(() => {
					if (pending > 0 && !waiting) {
						waiting = true;
						onWait?.(true);
					}
				}, WAIT_SIGNAL_MS);
			}
			job.then(settle, settle);
			return job;
		},
		ms(): number | undefined {
			if (started == null || ended == null) return;
			return Math.round(ended - started);
		},
	};
}

export type ExternalWatch = ReturnType<typeof watchExternal>;
