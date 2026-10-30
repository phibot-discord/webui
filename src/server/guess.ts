import { createHmac } from "node:crypto";
import sharp from "sharp";
import { bareId } from "@/lib/chart-catalog";
import { GUESS_STEPS } from "@/lib/guess";
import { songPath } from "@/lib/song-path";
import { getInfo } from "@/phi/lib/get-info";
import { chartCatalog } from "./charts";
import { logger } from "./logger";
import { fetchR2Object, publicObjectUrl, r2Config } from "./r2";

export const GUESS_W = 640;
export const GUESS_H = 360;

const ZOOM = [0.16, 0.24, 0.34, 0.48, 0.68, 1];
const BLUR = [6, 4.5, 3, 1.8, 0.8, 0];
const PIXEL = [10, 7, 0, 0, 0, 0];
const HUE = [150, 110, 70, 35, 0, 0];
const SATURATION = [0.35, 0.5, 0.7, 0.85, 1, 1];
const INVERT = [1, 1, 1, 0, 0, 0];

const at = (list: readonly number[], i: number) => list[i] ?? 0;

export type GuessSong = {
	id: string;
	title: string;
	composer: string;
	stem: string;
};

export type GuessAnswer = {
	id: string;
	title: string;
	composer: string;
	jacket?: string;
	path: string;
};

function secret(): string {
	const key =
		process.env.PHI_GUESS_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
	if (key) return key;
	if (process.env.NODE_ENV === "production") {
		throw new Error("guess: set PHI_GUESS_SECRET or AUTH_SECRET");
	}
	return "phibot-dev-guess";
}

export function seedBytes(label: string, key = secret()): Buffer {
	return createHmac("sha256", key).update(label).digest();
}

export function rngFrom(seed: Buffer): () => number {
	let a = seed.readUInt32LE(0);
	let b = seed.readUInt32LE(4);
	let c = seed.readUInt32LE(8);
	let d = seed.readUInt32LE(12);
	return () => {
		a >>>= 0;
		b >>>= 0;
		c >>>= 0;
		d >>>= 0;
		const t = (a + b) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		d = (d + 1) | 0;
		const r = (t + d) | 0;
		c = (c + r) | 0;
		return (r >>> 0) / 4294967296;
	};
}

export function pickIndex(puzzle: string, size: number, key?: string): number {
	if (size <= 0) return -1;
	return seedBytes(`answer:${puzzle}`, key).readUInt32LE(0) % size;
}

export async function guessPool(): Promise<GuessSong[]> {
	const { list } = await chartCatalog();
	return list
		.filter((s) => {
			const info = getInfo.ori_info[s.id];
			return info && !info.can_t_be_guessill;
		})
		.map((s) => ({
			id: s.id,
			title: s.song,
			composer: s.composer,
			stem: bareId(s.id),
		}))
		.sort((a, b) => (a.id < b.id ? -1 : 1));
}

export async function answerFor(
	puzzle: string,
): Promise<GuessSong | undefined> {
	const pool = await guessPool();
	return pool[pickIndex(puzzle, pool.length)];
}

function illKey(stem: string, size: "ill" | "illLow"): string {
	return `${r2Config().prefix || "original_ill"}/${size}/${stem}.png`;
}

export function answerView(song: GuessSong): GuessAnswer {
	return {
		id: song.id,
		title: song.title,
		composer: song.composer,
		jacket: publicObjectUrl(illKey(song.stem, "illLow")),
		path: songPath(song.id),
	};
}

const jackets = new Map<string, Promise<Buffer | undefined>>();
const JACKETS_MAX = 24;

function jacket(
	stem: string,
	size: "ill" | "illLow",
): Promise<Buffer | undefined> {
	const key = illKey(stem, size);
	const hit = jackets.get(key);
	if (hit) {
		jackets.delete(key);
		jackets.set(key, hit);
		return hit;
	}
	const job = fetchR2Object(key, { cache: "no-store" }).catch(() => undefined);
	jackets.set(key, job);
	while (jackets.size > JACKETS_MAX) {
		const oldest = jackets.keys().next().value;
		if (oldest === undefined) break;
		jackets.delete(oldest);
	}
	return job;
}

const images = new Map<string, Buffer>();
const IMAGES_MAX = 48;

function remember(key: string, buf: Buffer) {
	images.delete(key);
	images.set(key, buf);
	while (images.size > IMAGES_MAX) {
		const oldest = images.keys().next().value;
		if (oldest === undefined) break;
		images.delete(oldest);
	}
}

export async function puzzleImage(
	puzzle: string,
	step: number,
): Promise<Buffer | undefined> {
	const cacheKey = `${puzzle}:${step}`;
	const hot = images.get(cacheKey);
	if (hot) return hot;
	const pool = await guessPool();
	const answer = pool[pickIndex(puzzle, pool.length)];
	if (!answer) return undefined;
	const full = await jacket(answer.stem, "ill");
	if (!full) {
		logger.warn(`guess: no jacket for ${answer.id}`);
		return undefined;
	}
	const place = rngFrom(seedBytes(`place:${puzzle}`));
	const meta = await sharp(full).metadata();
	const jw = meta.width ?? GUESS_W;
	const jh = meta.height ?? GUESS_H;
	const s = Math.max(0, Math.min(GUESS_STEPS - 1, step));
	const cw = Math.min(jw, Math.max(32, Math.round(jw * at(ZOOM, s))));
	const ch = Math.min(jh, Math.max(18, Math.round((cw * GUESS_H) / GUESS_W)));
	const cx = 0.2 + place() * 0.6;
	const cy = 0.2 + place() * 0.6;
	const mirror = place() < 0.5;
	const hueSign = place() < 0.5 ? -1 : 1;
	const left = Math.round(Math.min(jw - cw, Math.max(0, cx * jw - cw / 2)));
	const top = Math.round(Math.min(jh - ch, Math.max(0, cy * jh - ch / 2)));

	let base = sharp(full)
		.extract({ left, top, width: cw, height: ch })
		.resize(GUESS_W, GUESS_H, { fit: "fill" });
	if (s < 3 && mirror) base = base.flop();
	if (at(HUE, s) || at(SATURATION, s) < 1) {
		base = base.modulate({
			hue: Math.round(hueSign * at(HUE, s)),
			saturation: at(SATURATION, s),
		});
	}
	if (at(BLUR, s)) base = base.blur(at(BLUR, s));
	let img = await base.png().toBuffer();
	const block = at(PIXEL, s);
	if (block) {
		img = await sharp(img)
			.resize(Math.round(GUESS_W / block), Math.round(GUESS_H / block))
			.resize(GUESS_W, GUESS_H, { kernel: "nearest" })
			.png()
			.toBuffer();
	}
	let out = sharp(img);
	if (at(INVERT, s)) out = out.negate({ alpha: false });
	const jpeg = await out.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
	remember(cacheKey, jpeg);
	return jpeg;
}
