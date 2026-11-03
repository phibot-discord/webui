import { isLocale, negotiateLocale } from "@/i18n/config";
import { cookieLocale } from "@/i18n/server";
import { authed } from "@/server/authed";
import { loadBound } from "@/server/bound";
import { chartCatalog } from "@/server/charts";
import { getHost } from "@/server/host";
import { localizedError, localizedRetryAfter } from "@/server/i18n-http";
import { logger } from "@/server/logger";
import { clientIp, rateLimit } from "@/server/rate-limit";
import { renderLock } from "@/server/render-lock";
import { isSnapView, progressSnap, targetsSnap } from "@/server/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAINT_MS = 30_000;

export async function GET(request: Request) {
	return authed(async (userId) => {
		const url = new URL(request.url);
		const view = url.searchParams.get("view");
		if (!isSnapView(view)) return localizedError(404, "unknown_card");
		const limited = rateLimit({ userId, ip: clientIp(request.headers) });
		if (!limited.ok)
			return localizedRetryAfter(limited.retryAfter, "rate_limit");
		const raw = url.searchParams.get("lang");
		const locale = isLocale(raw)
			? raw
			: (cookieLocale(request.headers) ??
				negotiateLocale(undefined, request.headers.get("accept-language")));
		const host = await getHost();
		const [bound, catalog] = await Promise.all([
			loadBound(host, userId, { memo: true }),
			chartCatalog(),
		]);
		if ("error" in bound) return localizedError(bound.status, bound.error);
		try {
			const snap =
				view === "progress"
					? progressSnap(bound.save, catalog.list, locale)
					: await targetsSnap(bound.save, catalog.list, locale);
			const img = await renderLock.run(
				() =>
					host.render(snap.id, snap.data, {
						height: snap.height,
						signal: AbortSignal.timeout(PAINT_MS),
					}),
				request.signal,
			);
			const day = new Date().toISOString().slice(0, 10);
			return new Response(new Uint8Array(img.bytes), {
				headers: {
					"Content-Type": img.mime,
					"Content-Length": String(img.bytes.byteLength),
					"Cache-Control": "private, no-store",
					"Content-Disposition": `${url.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="phibot-${view}-${day}.${img.ext}"`,
				},
			});
		} catch (err) {
			logger.warn(
				`snapshot ${view}: ${err instanceof Error ? err.message : err}`,
			);
			return localizedError(503, "render_failed");
		}
	});
}
