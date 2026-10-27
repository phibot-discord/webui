import { TAP_WAIT_PHASE } from "@/lib/tap-wait";
import { withTapWait } from "@/phi/lib/tapapi";
import { type ErrorKey, localizedErrorBody } from "./i18n-http";
import { logger, withDiscordUid } from "./logger";

export function tapWaitNdjson(
	userId: string,
	work: () => Promise<Record<string, unknown>>,
	fallback: ErrorKey = "refresh_failed",
): Response {
	const encoder = new TextEncoder();
	// A client that aborts mid-stream (a QR poll on cancel) cancels it; the work still finishes, unheard
	let gone = false;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			await withDiscordUid(userId, async () => {
				const send = (obj: unknown) => {
					if (gone) return;
					controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
				};
				try {
					const result = await withTapWait(
						() => send({ phase: TAP_WAIT_PHASE }),
						work,
					);
					send(result);
				} catch (err) {
					logger.error("tap-wait failed", err);
					send(await localizedErrorBody({ error: fallback, status: 502 }));
				} finally {
					if (!gone) controller.close();
				}
			});
		},
		cancel() {
			gone = true;
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
