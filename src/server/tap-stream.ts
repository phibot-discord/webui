import { TAP_WAIT_PHASE } from "@/lib/tap-wait";
import { withTapWait } from "@/phi/lib/tapapi";

export function tapWaitNdjson(
	work: () => Promise<Record<string, unknown>>,
	fallback: Record<string, unknown> = {
		error: "request_failed",
		code: "refresh_failed",
		status: 502,
	},
): Response {
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (obj: unknown) => {
				controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
			};
			try {
				const result = await withTapWait(
					() => send({ phase: TAP_WAIT_PHASE }),
					work,
				);
				send(result);
			} catch {
				send(fallback);
			} finally {
				controller.close();
			}
		},
	});
	return new Response(stream, {
		headers: {
			"Content-Type": "application/x-ndjson; charset=utf-8",
			"Cache-Control": "no-store",
			"X-Accel-Buffering": "no",
		},
	});
}
