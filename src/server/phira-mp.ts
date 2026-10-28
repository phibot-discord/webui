import {
	MP_ROOM_STATES,
	type MpData,
	type MpRoom,
	type MpRoomState,
} from "@/lib/phira-mp";
import { logger } from "@/server/logger";

const MP_API = (
	process.env.PHIRA_MP_API_URL?.trim() || "https://papi.phibot.dev"
).replace(/\/+$/, "");

const STATES = new Set<string>(MP_ROOM_STATES);

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj | null =>
	v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null;

const text = (v: unknown): string | null =>
	typeof v === "string" ? v : typeof v === "number" ? String(v) : null;

function readRoom(raw: unknown): MpRoom | null {
	const r = obj(raw);
	const id = text(r?.roomid);
	if (!r || !id) return null;
	const host = text(obj(r.host)?.id);
	const chart = obj(r.chart)?.name;
	const players = Array.isArray(r.players)
		? r.players.flatMap((p) => {
				const name = text(obj(p)?.name);
				return name == null
					? []
					: [{ name, host: host != null && text(obj(p)?.id) === host }];
			})
		: [];
	return {
		id,
		state:
			typeof r.state === "string" && STATES.has(r.state)
				? (r.state as MpRoomState)
				: "other",
		locked: r.lock === true,
		cycle: r.cycle === true,
		chart: typeof chart === "string" ? chart : null,
		players,
	};
}

export function readRooms(body: unknown): MpRoom[] | null {
	const rooms = obj(body)?.rooms;
	if (!Array.isArray(rooms)) return null;
	return rooms.flatMap((r) => readRoom(r) ?? []);
}

export function readServer(body: unknown): {
	up: boolean;
	players: number | null;
} {
	const s = obj(body);
	const players = s?.players;
	return {
		up: s?.status === "ok",
		players:
			typeof players === "number" && Number.isFinite(players) ? players : null,
	};
}

async function get(path: string, token: string): Promise<unknown> {
	const res = await fetch(`${MP_API}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
		cache: "no-store",
		signal: AbortSignal.timeout(8000),
	});
	if (!res.ok) throw new Error(`${path} ${res.status}`);
	return res.json();
}

const reason = (err: unknown) =>
	err instanceof Error ? err.message : String(err);

export async function loadMp(): Promise<MpData> {
	const checkedAt = Date.now();
	const token = process.env.PHIRA_MP_TOKEN?.trim();
	if (!token) {
		logger.warn("phira-mp: PHIRA_MP_TOKEN is not set");
		return { checkedAt, up: false, players: null, rooms: null };
	}
	const [status, rooms] = await Promise.allSettled([
		get("/v1/status", token),
		get("/v1/rooms", token),
	]);
	if (status.status === "rejected")
		logger.warn(`phira-mp status unavailable: ${reason(status.reason)}`);
	if (rooms.status === "rejected")
		logger.warn(`phira-mp rooms unavailable: ${reason(rooms.reason)}`);
	const server =
		status.status === "fulfilled"
			? readServer(status.value)
			: { up: false, players: null };
	return {
		checkedAt,
		...server,
		rooms: rooms.status === "fulfilled" ? readRooms(rooms.value) : null,
	};
}
