import { STATUS_TARGETS, type StatusData } from "@/lib/status";
import { logger } from "@/server/logger";
import { outgoingFetch } from "@/server/outgoing";

const STATUS_URL =
	process.env.STATUS_API_URL?.trim() || "https://api.phibot.dev/uptime";
const STATUS_MEMO_MS = 30_000;
const STATUS_TIMEOUT_MS = 8000;

type StatusFetch = (
	url: string,
	init: { signal: AbortSignal },
) => Promise<Response>;

let memo: { data: StatusData; at: number } | undefined;

export function resetStatusMemoForTest(): void {
	memo = undefined;
}

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

export function keepLastPage(env: {
	NODE_ENV?: string;
	NEXT_PHASE?: string;
}): boolean {
	return (
		env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build"
	);
}

export async function loadStatus(
	fetchImpl: StatusFetch = outgoingFetch,
	timeoutMs = STATUS_TIMEOUT_MS,
): Promise<StatusData | null> {
	if (memo && Date.now() - memo.at < STATUS_MEMO_MS) return memo.data;
	try {
		const res = await fetchImpl(STATUS_URL, {
			signal: AbortSignal.timeout(timeoutMs),
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
		if (body.phira && !Array.isArray(body.phira.series30d)) delete body.phira;
		memo = { data: body, at: Date.now() };
		return body;
	} catch (err) {
		logger.warn(
			`status unavailable: ${err instanceof Error ? err.message : String(err)}`,
		);
		return null;
	}
}
