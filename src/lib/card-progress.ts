import type { CardPhase } from "@/phi/lib/external";
import type { CardStats } from "./card-stats";

// Streamed paint: `phase …` lines, then `done {json}` and the image bytes, or `error {json}`; cache hits and 304s stay plain images

/** Request header ("1"): the client reads a progress stream */
export const CARD_PROGRESS_HEADER = "x-phi-progress";
export const CARD_PROGRESS_TYPE = "application/x-phi-card-progress";

export type CardProgressDone = { mime: string; stats?: CardStats };
export type CardProgressError = { error?: string; code?: string };

const PHASES = new Set<CardPhase>(["phib19", "render"]);

export function progressLine(
	kind: "phase" | "done" | "error",
	body: string,
): string {
	return `${kind} ${body}\n`;
}

function concat(a: Uint8Array, b: Uint8Array) {
	const out = new Uint8Array(a.length + b.length);
	out.set(a);
	out.set(b, a.length);
	return out;
}

export async function readCardProgress(
	body: ReadableStream<Uint8Array>,
	onPhase?: (phase: CardPhase) => void,
): Promise<
	{ done: CardProgressDone; image: Uint8Array[] } | { error: CardProgressError }
> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let head = new Uint8Array(0);
	let done: CardProgressDone | undefined;
	const image: Uint8Array[] = [];
	for (;;) {
		const { value, done: end } = await reader.read();
		if (value?.length) {
			if (done) image.push(value);
			else {
				head = concat(head, value);
				for (
					let nl = head.indexOf(10);
					nl >= 0 && !done;
					nl = head.indexOf(10)
				) {
					const line = decoder.decode(head.subarray(0, nl));
					head = head.subarray(nl + 1);
					const space = line.indexOf(" ");
					const kind = space < 0 ? line : line.slice(0, space);
					const rest = space < 0 ? "" : line.slice(space + 1);
					if (kind === "phase") {
						if (PHASES.has(rest as CardPhase)) onPhase?.(rest as CardPhase);
					} else if (kind === "done") {
						done = JSON.parse(rest) as CardProgressDone;
						if (head.length) image.push(head);
					} else if (kind === "error") {
						await reader.cancel().catch(() => {});
						return { error: JSON.parse(rest) as CardProgressError };
					}
				}
			}
		}
		if (end) break;
	}
	if (!done) throw new Error("card progress stream ended early");
	return { done, image };
}
