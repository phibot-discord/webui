import {
	CARD_PROGRESS_TYPE,
	type CardProgressError,
	progressLine,
} from "@/lib/card-progress";
import type { CardStats } from "@/lib/card-stats";
import type { CardPhase } from "@/phi/lib/external";

export function paintStream() {
	const encoder = new TextEncoder();
	let ctrl: ReadableStreamDefaultController<Uint8Array> | undefined;
	let closed = false;
	let last: CardPhase | undefined;
	const stream = new ReadableStream<Uint8Array>({
		start(c) {
			ctrl = c;
		},
		cancel() {
			closed = true;
		},
	});
	const write = (bytes: Uint8Array) => {
		if (!closed) ctrl?.enqueue(bytes);
	};
	const close = () => {
		if (closed) return;
		closed = true;
		ctrl?.close();
	};
	return {
		response(headers: Headers = new Headers()) {
			headers.set("Content-Type", CARD_PROGRESS_TYPE);
			// Partial or not, the next view asks again: a 200 from the card cache or a 304 then
			headers.set("Cache-Control", "no-store, no-transform");
			headers.set("X-Accel-Buffering", "no");
			return new Response(stream, { status: 200, headers });
		},
		phase(phase: CardPhase) {
			if (phase === last) return;
			last = phase;
			write(encoder.encode(progressLine("phase", phase)));
		},
		done(result: { bytes: Uint8Array; mime?: string; stats?: CardStats }) {
			write(
				encoder.encode(
					progressLine(
						"done",
						JSON.stringify({
							mime: result.mime ?? "image/jpeg",
							stats: result.stats,
						}),
					),
				),
			);
			write(result.bytes);
			close();
		},
		fail(body: CardProgressError) {
			write(encoder.encode(progressLine("error", JSON.stringify(body))));
			close();
		},
	};
}

export type PaintStream = ReturnType<typeof paintStream>;
