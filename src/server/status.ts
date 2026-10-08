import { STATUS_TARGETS, type StatusData } from "@/lib/status";
import { logger } from "@/server/logger";

const STATUS_URL =
	process.env.STATUS_API_URL?.trim() || "https://api.mdesk.tech/uptime";

function isStatusData(v: unknown): v is StatusData {
	const d = v as StatusData | null;
	return Boolean(
		d &&
			typeof d.generatedAt === "number" &&
			Array.isArray(d.targets) &&
			d.host &&
			Array.isArray(d.host.series24h),
	);
}

export async function loadStatus(): Promise<StatusData | null> {
	try {
		const res = await fetch(STATUS_URL, {
			next: { revalidate: 30 },
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) throw new Error(`status api ${res.status}`);
		const body: unknown = await res.json();
		if (!isStatusData(body)) throw new Error("status api: unexpected body");
		const known = new Set<string>(STATUS_TARGETS);
		body.targets = body.targets
			.filter((t) => known.has(t.id))
			.sort(
				(a, b) => STATUS_TARGETS.indexOf(a.id) - STATUS_TARGETS.indexOf(b.id),
			);
		return body;
	} catch (err) {
		logger.warn(
			`status unavailable: ${err instanceof Error ? err.message : String(err)}`,
		);
		return null;
	}
}
