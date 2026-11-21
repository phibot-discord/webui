import assert from "node:assert/strict";
import test from "node:test";
import { oggCrc, oggCut, oggRate, oggReserial, oggSerial } from "./ogg-cut";

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
	if (granule === -1) {
		view.setUint32(6, 0xffffffff, true);
		view.setUint32(10, 0xffffffff, true);
	} else {
		view.setUint32(6, granule % 4_294_967_296, true);
		view.setUint32(10, Math.floor(granule / 4_294_967_296), true);
	}
	out[26] = lacing.length;
	out.set(lacing, 27);
	out.set(payload, 27 + lacing.length);
	return out;
}

function vorbisHead(rate = 44_100): Uint8Array {
	const out = new Uint8Array(30);
	out[0] = 1;
	out.set(new TextEncoder().encode("vorbis"), 1);
	out[11] = 1;
	new DataView(out.buffer).setUint32(12, rate, true);
	return out;
}

function opusHead(): Uint8Array {
	const out = new Uint8Array(19);
	out.set(new TextEncoder().encode("OpusHead"), 0);
	out[8] = 1;
	out[9] = 2;
	return out;
}

const filler = (n: number) => new Uint8Array(n).fill(7);

function join(...parts: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}

const sizes = (...parts: Uint8Array[]) =>
	parts.reduce((n, p) => n + p.length, 0);

test("the sample rate is read from a Vorbis header", () => {
	const head = page(0, vorbisHead());
	assert.equal(oggRate(head), 44_100);
	assert.equal(oggRate(join(filler(3), head).subarray(3)), 44_100);
	assert.equal(oggRate(page(0, vorbisHead(48_000))), 48_000);
});

test("an Opus stream counts in 48,000 samples a second", () => {
	const head = page(0, opusHead());
	const tags = page(0, filler(20));
	const half = page(24_000, filler(50));
	const whole = page(48_000, filler(50));
	const bytes = join(head, tags, half, whole, page(72_000, filler(50)));
	assert.equal(oggRate(bytes), 48_000);
	assert.deepEqual(oggCut(bytes, 1), {
		end: sizes(head, tags, half, whole),
		reached: true,
	});
});

test("bytes that are not Ogg have no rate and no cut", () => {
	const text = new TextEncoder().encode("this is not an ogg stream at all, ok");
	assert.equal(oggRate(text), undefined);
	assert.equal(oggCut(text, 1), undefined);
	assert.equal(oggRate(new Uint8Array(0)), undefined);
	assert.equal(oggCut(new Uint8Array(0), 1), undefined);
	const other = join(page(0, filler(30)), page(44_100, filler(30)));
	assert.equal(oggRate(other), undefined);
	assert.equal(oggCut(other, 1), undefined);
	const short = join(
		page(0, vorbisHead().subarray(0, 14)),
		page(44_100, filler(30)),
	);
	assert.equal(oggRate(short), undefined);
	const good = join(page(0, vorbisHead()), page(44_100, filler(30)));
	assert.equal(oggCut(good, 0), undefined);
	assert.equal(oggCut(good, -1), undefined);
	assert.equal(oggCut(good, Number.NaN), undefined);
});

test("a cut ends after the first page that completes the wanted time", () => {
	const head = page(0, vorbisHead());
	const comment = page(0, filler(20));
	const setup = page(0, filler(40));
	const a = page(22_050, filler(100));
	const b = page(44_100, filler(100));
	const c = page(66_150, filler(100));
	const bytes = join(head, comment, setup, a, b, c);
	assert.deepEqual(oggCut(bytes, 1), {
		end: sizes(head, comment, setup, a, b),
		reached: true,
	});
	assert.deepEqual(oggCut(bytes, 1.2), { end: bytes.length, reached: true });
	assert.deepEqual(oggCut(bytes, 0.25), {
		end: sizes(head, comment, setup, a),
		reached: true,
	});
});

test("a page that completes no packet does not end a cut", () => {
	const head = page(0, vorbisHead());
	const comment = page(0, filler(20));
	const a = page(22_050, filler(100));
	const open = page(-1, filler(255));
	const b = page(44_100, filler(100));
	const bytes = join(head, comment, a, open, b);
	assert.deepEqual(oggCut(bytes, 0.75), { end: bytes.length, reached: true });
});

test("bytes that run out before the wanted time are served whole pages only", () => {
	const head = page(0, vorbisHead());
	const comment = page(0, filler(20));
	const a = page(22_050, filler(100));
	const b = page(44_100, filler(100));
	const c = page(66_150, filler(100));
	const full = join(head, comment, a, b, c);
	const before = sizes(head, comment, a, b);
	assert.deepEqual(oggCut(full.subarray(0, before + 50), 1.2), {
		end: before,
		reached: false,
	});
	assert.deepEqual(oggCut(full.subarray(0, before + 10), 1.2), {
		end: before,
		reached: false,
	});
	assert.deepEqual(oggCut(full, 5), { end: full.length, reached: false });
});

test("a stream with only header pages has no cut", () => {
	const bytes = join(
		page(0, vorbisHead()),
		page(0, filler(20)),
		page(0, filler(40)),
	);
	assert.equal(oggRate(bytes), 44_100);
	assert.equal(oggCut(bytes, 1), undefined);
});

test("a payload longer than 255 bytes is measured through its segment table", () => {
	const head = page(0, vorbisHead());
	const long = page(44_100, filler(600));
	assert.equal(long[26], 3);
	assert.deepEqual([...long.subarray(27, 30)], [255, 255, 90]);
	assert.equal(long.length, 27 + 3 + 600);
	const bytes = join(head, long, page(88_200, filler(10)));
	assert.deepEqual(oggCut(bytes, 1), {
		end: sizes(head, long),
		reached: true,
	});
});

test("a page with a broken header ends the reading at the last whole page", () => {
	const head = page(0, vorbisHead());
	const a = page(22_050, filler(100));
	const capture = page(44_100, filler(100));
	capture[3] = 0x58;
	assert.deepEqual(oggCut(join(head, a, capture), 1), {
		end: sizes(head, a),
		reached: false,
	});
	const version = page(44_100, filler(100));
	version[4] = 1;
	assert.deepEqual(oggCut(join(head, a, version), 1), {
		end: sizes(head, a),
		reached: false,
	});
	const tooLong = page(44_100, filler(100));
	tooLong[26] = 255;
	assert.deepEqual(oggCut(join(head, a, tooLong), 1), {
		end: sizes(head, a),
		reached: false,
	});
});

const REAL_FIRST_PAGE =
	"4f67675300020000000000000000e3bb76190000000051b81694011e01766f72626973000000000244ac0000000000000000000000000000bb01";

function hex(text: string): Uint8Array {
	return Uint8Array.from(text.match(/../g) ?? [], (h) =>
		Number.parseInt(h, 16),
	);
}

const u32 = (bytes: Uint8Array, at: number) =>
	new DataView(bytes.buffer, bytes.byteOffset).getUint32(at, true);

function sealed(bytes: Uint8Array, serial: number): Uint8Array {
	const out = bytes.slice();
	const view = new DataView(out.buffer);
	view.setUint32(14, serial, true);
	view.setUint32(22, 0, true);
	view.setUint32(22, oggCrc(out), true);
	return out;
}

function starts(bytes: Uint8Array): number[] {
	const out: number[] = [];
	let at = 0;
	while (at + 27 <= bytes.length) {
		out.push(at);
		const segments = bytes[at + 26] ?? 0;
		let body = 0;
		for (let i = 0; i < segments; i++) body += bytes[at + 27 + i] ?? 0;
		at += 27 + segments + body;
	}
	return out;
}

function checksumOk(bytes: Uint8Array, from: number, to: number): boolean {
	const copy = bytes.slice(from, to);
	const stored = u32(copy, 22);
	new DataView(copy.buffer).setUint32(22, 0, true);
	return oggCrc(copy) === stored;
}

test("the checksum is the Ogg CRC-32 and matches a page written by an encoder", () => {
	assert.equal(oggCrc(new TextEncoder().encode("123456789")), 0x89a1897f);
	assert.equal(oggCrc(new Uint8Array(0)), 0);
	const real = hex(REAL_FIRST_PAGE);
	assert.equal(real.length, 58);
	assert.equal(u32(real, 22), 0x9416b851);
	assert.ok(checksumOk(real, 0, real.length));
	assert.equal(oggSerial(real), 0x1976bbe3);
});

test("a new serial keeps every page readable, its payload as it was and its checksum right", () => {
	const SOURCE = 0x0a0b0c0d;
	const source = join(
		sealed(page(0, vorbisHead()), SOURCE),
		sealed(page(0, filler(20)), SOURCE),
		sealed(page(22_050, filler(600)), SOURCE),
		sealed(page(44_100, filler(100)), SOURCE),
		sealed(page(66_150, filler(100)), SOURCE),
	);
	const before = source.slice();
	const out = oggReserial(source, 0x1234abcd);
	assert.ok(out);
	assert.deepEqual(source, before);
	assert.equal(out.length, source.length);
	assert.equal(oggSerial(source), SOURCE);
	assert.equal(oggSerial(out), 0x1234abcd);
	assert.equal(oggRate(out), 44_100);
	assert.deepEqual(oggCut(out, 1), oggCut(source, 1));
	const at = starts(out);
	assert.deepEqual(at, starts(source));
	assert.equal(at.length, 5);
	const header = new Set<number>();
	at.forEach((from, i) => {
		const to = at[i + 1] ?? out.length;
		assert.equal(u32(out, from + 14), 0x1234abcd);
		assert.ok(checksumOk(source, from, to));
		assert.ok(checksumOk(out, from, to));
		for (const k of [14, 15, 16, 17, 22, 23, 24, 25]) header.add(from + k);
	});
	const changed = [...out.keys()].filter((i) => out[i] !== source[i]);
	assert.ok(changed.length > 0);
	assert.ok(changed.every((i) => header.has(i)));
});

test("two streams in one file keep two different serials", () => {
	const bytes = join(
		sealed(page(0, vorbisHead()), 7),
		sealed(page(0, opusHead()), 9),
		sealed(page(44_100, filler(30)), 7),
	);
	const out = oggReserial(bytes, 100);
	assert.ok(out);
	const [a = 0, b = 0, c = 0] = starts(out);
	assert.equal(u32(out, a + 14), 100);
	assert.equal(u32(out, c + 14), 100);
	assert.notEqual(u32(out, b + 14), 100);
});

test("bytes that are not Ogg get no serial", () => {
	const text = new TextEncoder().encode("this is not an ogg stream at all, ok");
	assert.equal(oggSerial(text), undefined);
	assert.equal(oggReserial(text, 5), undefined);
	assert.equal(oggReserial(new Uint8Array(0), 5), undefined);
});
