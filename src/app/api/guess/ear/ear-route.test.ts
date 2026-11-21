import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { setSessionForTest } from "@/auth";
import { setRequestLocaleForTest } from "@/i18n/server";
import { dailyId, dayKey } from "@/lib/guess";
import { SKIPPED } from "@/lib/guess-board";
import { oggCrc, oggCut, oggSerial } from "@/lib/ogg-cut";
import { clueToken, type GuessSong, setGuessPoolForTest } from "@/server/guess";
import { resetGuessBoardForTest } from "@/server/guess-board";
import {
	earAnswer,
	earClueToken,
	resetEarForTest,
	setEarHeadForTest,
} from "@/server/guess-ear";
import { resetRateLimitForTest } from "@/server/rate-limit";
import { GET as boardGet, POST as boardPost } from "../board/route";
import { POST as runPost } from "../run/route";
import { GET, POST } from "./route";

const kv = new Map<string, string>();
const meta = new Map<string, unknown>();
const db = {
	get: async (key: string) => kv.get(key),
	set: async (
		key: string,
		value: string,
		_ttlMs?: number,
		m?: Record<string, unknown>,
	) => {
		kv.set(key, value);
		if (m) meta.set(key, m);
		else meta.delete(key);
	},
	del: async (...keys: string[]) => {
		for (const k of keys) {
			kv.delete(k);
			meta.delete(k);
		}
	},
	list: async (prefix: string) =>
		[...kv.keys()]
			.filter((k) => k.startsWith(prefix))
			.map((key) => ({ key, meta: meta.get(key) })),
};
(globalThis as Record<string, unknown>).__phiDataHost = Promise.resolve({
	db,
	store: db,
});

const RATE = 44_100;
const POOL: GuessSong[] = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"].map(
	(name) => ({
		id: `${name}.Someone.0`,
		title: name,
		composer: "Someone",
		stem: `${name}.Someone`,
	}),
);
const SERIALS = new Map(POOL.map((s, i) => [`music/${s.stem}.ogg`, 4_000 + i]));

function page(granule: number, payload: Uint8Array, serial: number) {
	const lacing: number[] = [];
	let left = payload.length;
	while (left >= 255) {
		lacing.push(255);
		left -= 255;
	}
	lacing.push(left);
	const out = new Uint8Array(27 + lacing.length + payload.length);
	out.set([0x4f, 0x67, 0x67, 0x53], 0);
	const view = new DataView(out.buffer);
	view.setUint32(6, granule, true);
	view.setUint32(14, serial, true);
	out[26] = lacing.length;
	out.set(lacing, 27);
	out.set(payload, 27 + lacing.length);
	view.setUint32(22, oggCrc(out), true);
	return out;
}

function music(serial: number): Uint8Array {
	const head = new Uint8Array(30);
	head[0] = 1;
	head.set(new TextEncoder().encode("vorbis"), 1);
	new DataView(head.buffer).setUint32(12, RATE, true);
	const pages = [page(0, head, serial), page(0, new Uint8Array(12), serial)];
	for (let g = RATE / 4; g <= 20 * RATE; g += RATE / 4) {
		pages.push(page(g, new Uint8Array(200).fill(g % 251), serial));
	}
	const out = new Uint8Array(pages.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of pages) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

const TODAY = dailyId();
const YESTERDAY = dailyId(dayKey(new Date(Date.now() - 86_400_000)));
const IP = { "x-forwarded-for": "203.0.113.40" };

beforeEach(() => {
	kv.clear();
	meta.clear();
	resetRateLimitForTest();
	resetGuessBoardForTest();
	resetEarForTest();
	setRequestLocaleForTest("en");
	setGuessPoolForTest(POOL);
	setEarHeadForTest(async (key) => {
		const serial = SERIALS.get(key);
		return serial === undefined ? undefined : music(serial);
	});
});

afterEach(() => {
	setSessionForTest();
	setRequestLocaleForTest();
	setGuessPoolForTest();
	setEarHeadForTest();
});

function clip(query: Record<string, string>) {
	return GET(
		new Request(
			`http://localhost/api/guess/ear?${new URLSearchParams(query)}`,
			{
				headers: IP,
			},
		),
	);
}

function send(
	handler: (request: Request) => Promise<Response>,
	path: string,
	body: unknown,
) {
	return handler(
		new Request(`http://localhost${path}`, {
			method: "POST",
			headers: { "content-type": "application/json", ...IP },
			body: JSON.stringify(body),
		}),
	);
}

const guess = (body: Record<string, unknown>) =>
	send(POST, "/api/guess/ear", body);

async function board(day: string, game?: string) {
	const res = await boardGet(
		new Request(
			`http://localhost/api/guess/board?${new URLSearchParams({ day, fresh: "1", ...(game ? { game } : {}) })}`,
			{ headers: IP },
		),
	);
	return (await res.json()) as {
		total: number;
		rows: { tries: number }[];
	};
}

type Reply = {
	correct?: boolean;
	ranked?: boolean;
	clue?: string;
	code?: string;
	run?: { guesses: string[]; status: string; t0: number } | null;
	answer?: { title: string };
};

async function answers() {
	const answer = await earAnswer(TODAY);
	assert.ok(answer);
	const wrong = POOL.find((s) => s.id !== answer.id);
	assert.ok(wrong);
	return { answer, wrong };
}

function sourceOf(stem: string) {
	return music(SERIALS.get(`music/${stem}.ogg`) ?? -1);
}

test("today's clips need the token of their own puzzle and step", async () => {
	const refused: Record<string, string>[] = [
		{ p: TODAY, s: "0" },
		{ p: TODAY, s: "0", k: earClueToken(TODAY, 1) },
		{ p: TODAY, s: "0", k: earClueToken(YESTERDAY, 0) },
		{ p: TODAY, s: "0", k: clueToken(TODAY, 0) },
	];
	for (const query of refused) {
		const res = await clip(query);
		assert.equal(res.status, 403, JSON.stringify(query));
		assert.equal(res.headers.get("cache-control"), "no-store");
	}
	const res = await clip({ p: TODAY, s: "0", k: earClueToken(TODAY, 0) });
	assert.equal(res.status, 200);
	assert.equal(res.headers.get("content-type"), "audio/ogg");
	const bytes = new Uint8Array(await res.arrayBuffer());
	const { answer } = await answers();
	const source = sourceOf(answer.stem);
	assert.equal(bytes.length, oggCut(source, 1)?.end);
	assert.notEqual(oggSerial(bytes), oggSerial(source));
	assert.notDeepEqual(bytes, source.subarray(0, bytes.length));
});

test("past dailies and practice songs are open, and only daily clips get a new serial", async () => {
	const past = await clip({ p: YESTERDAY, s: "2" });
	assert.equal(past.status, 200);
	const pastBytes = new Uint8Array(await past.arrayBuffer());
	const pastAnswer = await earAnswer(YESTERDAY);
	assert.ok(pastAnswer);
	assert.notEqual(oggSerial(pastBytes), oggSerial(sourceOf(pastAnswer.stem)));
	const practice = await clip({ p: "p-abcdefghijkl", s: "0" });
	assert.equal(practice.status, 200);
	const practiceBytes = new Uint8Array(await practice.arrayBuffer());
	const practiceAnswer = await earAnswer("p-abcdefghijkl");
	assert.ok(practiceAnswer);
	const source = sourceOf(practiceAnswer.stem);
	assert.deepEqual(practiceBytes, source.subarray(0, practiceBytes.length));
	assert.equal((await clip({ p: "d-2099-01-01", s: "0" })).status, 404);
});

test("the sound check before Start plays another song than today's", async () => {
	const res = await clip({ probe: "1" });
	assert.equal(res.status, 200);
	assert.equal(res.headers.get("cache-control"), "no-store");
	const bytes = new Uint8Array(await res.arrayBuffer());
	const { answer } = await answers();
	const serial = oggSerial(bytes);
	assert.ok(serial !== undefined && serial >= 4_000);
	assert.notEqual(serial, SERIALS.get(`music/${answer.stem}.ogg`));
	assert.ok(bytes.length < (oggCut(music(serial), 1)?.end ?? 0));
});

test("today's daily by ear needs a sign-in and a started run of its own", async () => {
	setSessionForTest(null);
	const guest = await guess({ p: TODAY, guess: POOL[0]?.id });
	assert.equal(guest.status, 401);
	assert.equal(((await guest.json()) as Reply).code, "unauthorized");
	const start = (await (
		await send(runPost, "/api/guess/run", { p: TODAY, game: "ear" })
	).json()) as Reply;
	assert.equal(start.run, null);
	const open = (await (
		await guess({ p: YESTERDAY, guess: "nope", step: 5 })
	).json()) as Reply;
	assert.equal(open.correct, false);
	assert.ok(open.answer);

	setSessionForTest("u1");
	await send(runPost, "/api/guess/run", { p: TODAY });
	const early = await guess({ p: TODAY, guess: POOL[0]?.id });
	assert.equal(early.status, 409);
	assert.equal(((await early.json()) as Reply).code, "not_started");
});

test("start, a wrong guess, a skip and a win: each step hands out the next clue and the win lands on the ear board", async () => {
	setSessionForTest("u1");
	const { answer, wrong } = await answers();
	const started = (await (
		await send(runPost, "/api/guess/run", { p: TODAY, game: "ear" })
	).json()) as Reply;
	assert.equal(started.run?.status, "playing");
	const first = new URL(started.clue ?? "", "http://localhost");
	assert.equal(first.pathname, "/api/guess/ear");
	assert.equal(first.searchParams.get("k"), earClueToken(TODAY, 0));

	const miss = (await (
		await guess({ p: TODAY, guess: wrong.id, rank: true })
	).json()) as Reply;
	assert.equal(miss.correct, false);
	assert.deepEqual(miss.run?.guesses, [wrong.id]);
	const second = new URL(miss.clue ?? "", "http://localhost");
	assert.equal(second.searchParams.get("s"), "1");
	assert.equal(
		(await clip(Object.fromEntries(second.searchParams))).status,
		200,
	);
	assert.equal(
		(await clip({ p: TODAY, s: "2", k: second.searchParams.get("k") ?? "" }))
			.status,
		403,
	);

	const skipped = (await (
		await guess({ p: TODAY, skip: true })
	).json()) as Reply;
	assert.deepEqual(skipped.run?.guesses, [wrong.id, SKIPPED]);
	assert.equal(
		new URL(skipped.clue ?? "", "http://localhost").searchParams.get("k"),
		earClueToken(TODAY, 2),
	);

	const win = (await (
		await guess({ p: TODAY, guess: answer.id, rank: true })
	).json()) as Reply;
	assert.equal(win.correct, true);
	assert.equal(win.ranked, true);
	assert.equal(win.run?.status, "won");
	assert.equal(win.answer?.title, answer.title);

	const day = TODAY.slice(2);
	const ear = await board(day, "ear");
	assert.equal(ear.total, 1);
	assert.equal(ear.rows[0]?.tries, 3);
	assert.equal((await board(day)).total, 0);

	const off = await send(boardPost, "/api/guess/board", {
		day,
		on: false,
		game: "ear",
	});
	assert.deepEqual(await off.json(), { ranked: false });
	assert.equal((await board(day, "ear")).total, 0);
	const on = await send(boardPost, "/api/guess/board", {
		day,
		on: true,
		game: "ear",
	});
	assert.deepEqual(await on.json(), { ranked: true });
	assert.equal((await board(day, "ear")).total, 1);
	assert.equal((await board(day)).total, 0);
});

test("giving up ends the run without an entry, and the rank switch cannot add it", async () => {
	setSessionForTest("u2");
	await send(runPost, "/api/guess/run", { p: TODAY, game: "ear" });
	const lost = (await (
		await guess({ p: TODAY, giveUp: true })
	).json()) as Reply;
	assert.equal(lost.run?.status, "lost");
	assert.ok(lost.answer);
	const on = await send(boardPost, "/api/guess/board", {
		day: TODAY.slice(2),
		on: true,
		game: "ear",
	});
	assert.deepEqual(await on.json(), { ranked: false });
	assert.equal((await board(TODAY.slice(2), "ear")).total, 0);
});

test("other days are not ranked: no run starts and the rank switch refuses them", async () => {
	setSessionForTest("u3");
	const start = (await (
		await send(runPost, "/api/guess/run", { p: YESTERDAY, game: "ear" })
	).json()) as Reply;
	assert.equal(start.run, null);
	const rank = await send(boardPost, "/api/guess/board", {
		day: YESTERDAY.slice(2),
		on: true,
		game: "ear",
	});
	assert.equal(rank.status, 400);
	const past = (await (
		await guess({ p: YESTERDAY, guess: "nope", rank: true })
	).json()) as Reply;
	assert.equal(past.correct, false);
	assert.equal(past.run, undefined);
	assert.equal(kv.size, 0);
});
