export const STATUS_TARGETS = ["workers", "kv", "assets", "phira"] as const;
export type StatusTargetId = (typeof STATUS_TARGETS)[number];
export type StatusState = "up" | "degraded" | "down" | "unknown";

export type CheckBucket = {
	t: number;
	checks: number;
	uptime: number | null;
	latency: number | null;
	p95: number | null;
};

export type StatusTarget = {
	id: StatusTargetId;
	status: StatusState;
	latencyMs: number | null;
	checkedAt: number | null;
	error: string | null;
	uptime24h: number | null;
	uptime30d: number | null;
	days: CheckBucket[];
	hours: CheckBucket[];
};

export type HostPoint = { t: number; cpu: number | null; mem: number | null };

export type StatusHost = {
	cpu: number | null;
	mem: number | null;
	memUsedMb: number | null;
	memTotalMb: number | null;
	load1: number | null;
	cores: number;
	uptimeSec: number;
	sampledAt: number | null;
	series24h: HostPoint[];
	series30d: HostPoint[];
};

export type PhiraPoint = {
	t: number;
	players: number | null;
	rooms: number | null;
	cpu: number | null;
	mem: number | null;
};

export type StatusPhira = {
	players: number | null;
	rooms: number | null;
	playing: number | null;
	cpu: number | null;
	cpuProcess: number | null;
	mem: number | null;
	memProcessMb: number | null;
	memUsedMb: number | null;
	memTotalMb: number | null;
	sampledAt: number | null;
	series24h: PhiraPoint[];
	series30d: PhiraPoint[];
};

export type StatusData = {
	generatedAt: number;
	intervalSec: number;
	since: number | null;
	targets: StatusTarget[];
	host: StatusHost;
	phira?: StatusPhira;
};
