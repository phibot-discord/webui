import assert from "node:assert/strict";
import test from "node:test";
import { readRooms, readServer } from "./phira-mp";

test("rooms keep names only and mark the host across id types", () => {
	const rooms = readRooms({
		rooms: [
			{
				roomid: "112233",
				cycle: false,
				lock: true,
				host: { name: "泪稚苒", id: "3461054" },
				state: "playing",
				chart: { name: "星降る夜と一輪の花", id: "69901" },
				players: [
					{ name: "泪稚苒", id: 3461054 },
					{ name: "聆碎a", id: 3462386 },
				],
			},
			{
				roomid: "lobby",
				cycle: true,
				lock: false,
				host: { name: "x", id: "1" },
				state: "something_new",
				chart: null,
				players: [],
			},
			{ cycle: true },
		],
	});
	assert.deepEqual(rooms, [
		{
			id: "112233",
			state: "playing",
			locked: true,
			cycle: false,
			chart: "星降る夜と一輪の花",
			players: [
				{ name: "泪稚苒", host: true },
				{ name: "聆碎a", host: false },
			],
		},
		{
			id: "lobby",
			state: "other",
			locked: false,
			cycle: true,
			chart: null,
			players: [],
		},
	]);
	assert.equal(readRooms({}), null);
	assert.equal(readRooms(null), null);
});

test("the server is up only when it says ok", () => {
	assert.deepEqual(readServer({ status: "ok", players: 128 }), {
		up: true,
		players: 128,
	});
	assert.deepEqual(readServer({ status: "starting" }), {
		up: false,
		players: null,
	});
	assert.deepEqual(readServer("nope"), { up: false, players: null });
});
