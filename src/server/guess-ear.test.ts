import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { clipOf, readCapped, resetEarForTest } from "./guess-ear";

const RATE = 44_100;
const HALF = RATE / 2;

function page(granule: number, payload: Uint8Array): Uint8Array {
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
	view.setUint32(6, granule % 4_294_967_296, true);
	view.setUint32(10, Math.floor(granule / 4_294_967_296), true);
	out[26] = lacing.length;
	out.set(lacing, 27);
	out.set(payload, 27 + lacing.length);
	return out;
}

function vorbisHead(): Uint8Array {
	const out = new Uint8Array(30);
	out[0] = 1;
	out.set(new TextEncoder().encode("vorbis"), 1);
	out[11] = 1;
	new DataView(out.buffer).setUint32(12, RATE, true);
	return out;
}

function song(): { bytes: Uint8Array; ends: Map<number, number> } {
	const pages = [page(0, vorbisHead()), page(0, new Uint8Array(16).fill(3))];
	for (let g = HALF; g <= 20 * RATE; g += HALF) {
		pages.push(page(g, new Uint8Array(300).fill(9)));
	}
	const bytes = new Uint8Array(pages.reduce((n, p) => n + p.length, 0));
	const ends = new Map<number, number>();
	let at = 0;
	pages.forEach((p, i) => {
		bytes.set(p, at);
		at += p.length;
		if (i >= 2) ends.set((i - 1) * HALF, at);
	});
	return { bytes, ends };
}

function loader(bytes: Uint8Array | undefined) {
	const keys: string[] = [];
	return {
		keys,
		load: async (key: string) => {
			keys.push(key);
			return bytes;
		},
	};
}

beforeEach(() => {
	resetEarForTest();
});

test("a clip is the song's music cut at the step's length", async () => {
	const { bytes, ends } = song();
	const { load } = loader(bytes);
	const first = await clipOf("Some.Song", 0, load);
	const end1 = ends.get(RATE);
	assert.ok(first && end1);
	assert.equal(first.length, end1);
	assert.deepEqual(first, bytes.subarray(0, end1));
	const last = await clipOf("Some.Song", 5, load);
	const end16 = ends.get(16 * RATE);
	assert.ok(last && end16);
	assert.equal(last.length, end16);
	assert.deepEqual(last, bytes.subarray(0, end16));
	assert.ok(end16 < bytes.length);
});

test("the loader is asked for the song's music by its object key", async () => {
	const { keys, load } = loader(song().bytes);
	await clipOf("Glaciaxion.SunsetRay", 2, load);
	assert.deepEqual(keys, ["music/Glaciaxion.SunsetRay.ogg"]);
});

test("the six clues of a song fetch the music once", async () => {
	const { keys, load } = loader(song().bytes);
	const clips = await Promise.all(
		[0, 1, 2, 3, 4, 5].map((step) => clipOf("Some.Song", step, load)),
	);
	for (let step = 0; step < 6; step++) await clipOf("Some.Song", step, load);
	assert.equal(keys.length, 1);
	const lengths = clips.map((c) => c?.length ?? 0);
	assert.deepEqual(
		lengths,
		[...lengths].sort((a, b) => a - b),
	);
	assert.equal(new Set(lengths).size, 6);
});

test("a failed fetch gives no clip and is tried again next time", async () => {
	const missing = loader(undefined);
	assert.equal(await clipOf("Some.Song", 0, missing.load), undefined);
	const found = loader(song().bytes);
	const clip = await clipOf("Some.Song", 0, found.load);
	assert.ok(clip && clip.length > 0);
	assert.equal(missing.keys.length, 1);
	assert.equal(found.keys.length, 1);
});

test("a loader that throws gives no clip", async () => {
	const load = async (): Promise<Uint8Array | undefined> => {
		throw new Error("asset host down");
	};
	assert.equal(await clipOf("Some.Song", 0, load), undefined);
	const { keys, load: again } = loader(song().bytes);
	assert.ok(await clipOf("Some.Song", 0, again));
	assert.equal(keys.length, 1);
});

test("a response longer than the cap is read only up to the cap", async () => {
	let pulls = 0;
	let cancelled = false;
	const endless = new ReadableStream<Uint8Array>({
		pull(controller) {
			pulls++;
			controller.enqueue(new Uint8Array(400).fill(pulls % 256));
		},
		cancel() {
			cancelled = true;
		},
	});
	const head = await readCapped(new Response(endless), 1000);
	assert.equal(head.length, 1000);
	assert.equal(head[0], 1);
	assert.equal(head[999], 3);
	assert.ok(pulls <= 4);
	await new Promise((resolve) => setTimeout(resolve, 0));
	assert.ok(cancelled);
	const short = await readCapped(
		new Response(new Uint8Array(10).fill(5)),
		1000,
	);
	assert.deepEqual(short, new Uint8Array(10).fill(5));
});
