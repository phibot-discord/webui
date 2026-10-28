export const MP_ROOM_STATES = [
	"select_chart",
	"waiting_for_ready",
	"playing",
] as const;
export type MpRoomState = (typeof MP_ROOM_STATES)[number] | "other";

export type MpRoom = {
	id: string;
	state: MpRoomState;
	locked: boolean;
	cycle: boolean;
	chart: string | null;
	players: { name: string; host: boolean }[];
};

export type MpData = {
	checkedAt: number;
	up: boolean;
	players: number | null;
	rooms: MpRoom[] | null;
};
