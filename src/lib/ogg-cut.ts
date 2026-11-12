type OggPage = { end: number; data: number; granule: number };

const CAPTURE = [0x4f, 0x67, 0x67, 0x53];
const HEADER = 27;
const NO_GRANULE = -1;
const OPUS_RATE = 48_000;

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
