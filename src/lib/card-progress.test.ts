import assert from "node:assert/strict";
import test from "node:test";
import { paintStream } from "@/server/card-stream";
import { readCardProgress } from "./card-progress";

async function rechunk(res: Response, size: number) {
	const all = new Uint8Array(await res.arrayBuffer());
	return new ReadableStream<Uint8Array>({
		start(c) {
			for (let i = 0; i < all.length; i += size)
				c.enqueue(all.subarray(i, i + size));
			c.close();
		},
	});
}

test("a streamed paint reports its phases, then the stats and the exact image bytes", async () => {
	const image = Uint8Array.from({ length: 300 }, (_, i) => (i * 7 + 10) % 256);
	for (const size of [1, 7, 4096]) {
		const s = paintStream();
		const res = s.response();
		assert.equal(
			res.headers.get("content-type"),
			"application/x-phi-card-progress",
		);
		assert.match(res.headers.get("cache-control") ?? "", /no-store/);
		s.phase("phib19");
		s.phase("phib19");
		s.phase("render");
		s.done({
			bytes: image,
			mime: "image/jpeg",
			stats: {
				cache: "miss",
				cacheMs: 1,
				totalMs: 9,
				extMs: 4,
				missing: ["peers"],
			},
		});
		const phases: string[] = [];
		const out = await readCardProgress(await rechunk(res, size), (p) =>
			phases.push(p),
		);
		assert.deepEqual(phases, ["phib19", "render"], `chunk ${size}`);
		assert.ok("done" in out);
		assert.equal(out.done.mime, "image/jpeg");
		assert.deepEqual(out.done.stats?.missing, ["peers"]);
		assert.equal(out.done.stats?.extMs, 4);
		const bytes = new Uint8Array(
			await new Blob(out.image as BlobPart[]).arrayBuffer(),
		);
		assert.deepEqual(bytes, image, `chunk ${size}`);
	}
});

test("a streamed paint that fails ends with its error", async () => {
	const s = paintStream();
	const res = s.response();
	s.phase("phib19");
	s.fail({ error: "Could not render this card.", code: "render_failed" });
	const out = await readCardProgress(res.body as ReadableStream<Uint8Array>);
	assert.deepEqual(out, {
		error: { error: "Could not render this card.", code: "render_failed" },
	});
});

test("a stream cut before the image is an error, not an empty card", async () => {
	const cut = new ReadableStream<Uint8Array>({
		start(c) {
			c.enqueue(new TextEncoder().encode("phase render\n"));
			c.close();
		},
	});
	await assert.rejects(readCardProgress(cut), /ended early/);
});
