import { displayPlayerId } from "@/lib/player-display";
import {
	exportFileName,
	exportRows,
	parseExportFormat,
	toCsv,
} from "@/lib/records-export";
import { authed } from "@/server/authed";
import { lastSyncedIso, loadBound } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { localizedError } from "@/server/i18n-http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
	return authed(async (userId) => {
		const limited = rateLimit({
			userId: `export:${userId}`,
			ip: `export:${clientIp(request.headers)}`,
		});
		if (!limited.ok) return localizedError(429, "rate_limit");
		const got = await loadBound(await getDataHost(), userId);
		if ("error" in got) return localizedError(got.status, got.error);
		const format = parseExportFormat(
			new URL(request.url).searchParams.get("format"),
		);
		const rows = exportRows(got.save.getRecord());
		const name = exportFileName(format);
		const body =
			format === "json"
				? JSON.stringify(
						{
							player: displayPlayerId(got.save.saveInfo.PlayerId),
							rks: got.save.saveInfo.summary?.rankingScore ?? null,
							savedAt: lastSyncedIso(got.save) ?? null,
							exportedAt: new Date().toISOString(),
							records: rows,
						},
						null,
						2,
					)
				: toCsv(rows);
		return new Response(body, {
			headers: {
				"Content-Type":
					format === "json"
						? "application/json; charset=utf-8"
						: "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${name}"`,
				"Cache-Control": "private, no-store",
			},
		});
	});
}
