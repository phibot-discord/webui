export const KEY_TYPES = [
	"read",
	"single",
	"collection",
	"illustration",
	"avatar",
] as const;
export type KeyType = (typeof KEY_TYPES)[number];

export type GameKeyEntry = { name: string; types: KeyType[]; flags: number[] };
export type GameKeyBlock = { entries: GameKeyEntry[]; tail: number[] };

export class GameKeyFormatError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GameKeyFormatError";
	}
}

export function readGameKey(plain: Uint8Array): GameKeyBlock {
	let at = 0;
	const need = (n: number) => {
		if (at + n > plain.length)
			throw new GameKeyFormatError(`cut at byte ${at}`);
	};
	const byte = () => {
		need(1);
		return plain[at++] ?? 0;
	};
	const number = () => {
		const low = byte();
		if (low < 0x80) return low;
		const high = byte();
		if (high > 0x7f)
			throw new GameKeyFormatError(`number too long at byte ${at - 2}`);
		return (low & 0x7f) | (high << 7);
	};
	const decoder = new TextDecoder("utf-8", { fatal: true });
	const text = () => {
		const n = number();
		need(n);
		const start = at;
		at += n;
		try {
			return decoder.decode(plain.subarray(start, at));
		} catch {
			throw new GameKeyFormatError(`bad text at byte ${start}`);
		}
	};
	const count = number();
	const entries: GameKeyEntry[] = [];
	for (let i = 0; i < count; i++) {
		const name = text();
		const length = byte();
		if (length < 1) throw new GameKeyFormatError(`empty key at byte ${at - 1}`);
		need(length);
		const bits = plain[at] ?? 0;
		const flags = [...plain.subarray(at + 1, at + length)];
		at += length;
		entries.push({
			name,
			types: KEY_TYPES.filter((_, bit) => (bits & (1 << bit)) !== 0),
			flags,
		});
	}
	return { entries, tail: [...plain.subarray(at)] };
}
