type OggPage = { start: number; end: number; data: number; granule: number };

const CAPTURE = [0x4f, 0x67, 0x67, 0x53];
const HEADER = 27;
const NO_GRANULE = -1;
const OPUS_RATE = 48_000;
const SERIAL = 14;
const CHECKSUM = 22;

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let r = i << 24;
		for (let bit = 0; bit < 8; bit++) {
			r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
		}
		table[i] = r >>> 0;
	}
	return table;
})();

function readPages(bytes: Uint8Array): OggPage[] {
	const pages: OggPage[] = [];
	let at = 0;
	while (at + HEADER <= bytes.length) {
		if (CAPTURE.some((b, i) => bytes[at + i] !== b)) break;
		if (bytes[at + 4] !== 0) break;
		const segments = bytes[at + 26] ?? 0;
		const table = at + HEADER;
		if (table + segments > bytes.length) break;
		let body = 0;
		for (let i = 0; i < segments; i++) body += bytes[table + i] ?? 0;
		const data = table + segments;
		const end = data + body;
		if (end > bytes.length) break;
		const view = new DataView(bytes.buffer, bytes.byteOffset + at + 6, 8);
		const low = view.getUint32(0, true);
		const high = view.getUint32(4, true);
		pages.push({
			start: at,
			end,
			data,
			granule:
				low === 0xffffffff && high === 0xffffffff
					? NO_GRANULE
					: high * 4_294_967_296 + low,
		});
		at = end;
	}
	return pages;
}

function ascii(bytes: Uint8Array, from: number, length: number): string {
	let out = "";
	for (let i = from; i < from + length && i < bytes.length; i++)
		out += String.fromCharCode(bytes[i] ?? 0);
	return out;
}

export function oggRate(bytes: Uint8Array): number | undefined {
	const first = readPages(bytes)[0];
	if (!first) return undefined;
	if (bytes[first.data] === 1 && ascii(bytes, first.data + 1, 6) === "vorbis") {
		if (first.data + 16 > first.end) return undefined;
		const rate = new DataView(
			bytes.buffer,
			bytes.byteOffset + first.data + 12,
			4,
		).getUint32(0, true);
		return rate > 0 ? rate : undefined;
	}
	if (ascii(bytes, first.data, 8) === "OpusHead") return OPUS_RATE;
	return undefined;
}

export function oggCut(
	bytes: Uint8Array,
	seconds: number,
): { end: number; reached: boolean } | undefined {
	const rate = oggRate(bytes);
	if (!rate || !(seconds > 0)) return undefined;
	const want = seconds * rate;
	let end = 0;
	let audio = false;
	for (const page of readPages(bytes)) {
		end = page.end;
		if (page.granule > 0) audio = true;
		if (page.granule >= want) return { end, reached: true };
	}
	return audio ? { end, reached: false } : undefined;
}

export function oggCrc(bytes: Uint8Array): number {
	let crc = 0;
	for (const b of bytes) {
		crc = ((crc << 8) ^ (CRC_TABLE[((crc >>> 24) ^ b) & 0xff] ?? 0)) >>> 0;
	}
	return crc;
}

export function oggSerial(bytes: Uint8Array): number | undefined {
	const first = readPages(bytes)[0];
	if (!first) return undefined;
	return new DataView(
		bytes.buffer,
		bytes.byteOffset + first.start + SERIAL,
		4,
	).getUint32(0, true);
}

export function oggReserial(
	bytes: Uint8Array,
	serial: number,
): Uint8Array | undefined {
	const pages = readPages(bytes);
	const first = pages[0];
	if (!first) return undefined;
	const out = bytes.slice();
	const view = new DataView(out.buffer, out.byteOffset, out.length);
	const shift = (view.getUint32(first.start + SERIAL, true) ^ serial) >>> 0;
	for (const page of pages) {
		const at = page.start;
		const own = view.getUint32(at + SERIAL, true);
		view.setUint32(at + SERIAL, (own ^ shift) >>> 0, true);
		view.setUint32(at + CHECKSUM, 0, true);
		view.setUint32(at + CHECKSUM, oggCrc(out.subarray(at, page.end)), true);
	}
	return out;
}
