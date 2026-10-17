import { after } from "next/server";
import sharp from "sharp";
import type { Locale } from "@/i18n/config";
import { catalogs } from "@/i18n/server";
import { configuredAuthOrigins } from "@/lib/auth-url";
import { OG_SIZE, OG_VERSION } from "@/lib/og";
import { getInfo } from "@/phi/lib/get-info";
import type { BoundErr } from "./bound";
import { type CardKind, renderCard } from "./cards";
import { getHost } from "./host";
import { hydrateIlls } from "./ill";
import { pageCopy, type TitleCardPage } from "./og-meta";
import { OG_PAGE_TEMPLATE, type OgPageData } from "./render/og-page";
import { withTimeout } from "./render-lock";
import { exists } from "./vfs";

const ACCENTS = ["#4fc3f7", "#ef5350", "#b388ff", "#66bb6a", "#ffca28"];
const TILES = 6;
const PAINT_TIMEOUT_MS = 30_000;
/** Chat crawlers give up after a few seconds; a card that takes longer is served next time */
const CARD_WAIT_MS = 8_000;
const CARD_CACHE =
	"public, max-age=300, s-maxage=900, stale-while-revalidate=86400";
export const TITLE_CARD_CACHE =
	"public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const FALLBACK_CACHE = "public, max-age=0, s-maxage=60";
/** The image the site used before these were rendered */
export const STATIC_OG = "/og/fallback.jpg";

function hash(text: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/** The same jackets for a page every time, so a re-render after a cold start looks the same */
function songsFor(id: string, n: number): string[] {
	const pool = getInfo.illlist.filter((s) => getInfo.ori_info[s]).sort();
	let seed = hash(`${id}:${OG_VERSION}`);
	const next = () => {
		seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
		return seed / 0x100000000;
	};
	for (let i = 0; i < Math.min(n, pool.length); i++) {
		const j = i + Math.floor(next() * (pool.length - i));
		[pool[i], pool[j]] = [pool[j] as string, pool[i] as string];
	}
	return pool.slice(0, n);
}

function siteHost(): string {
	const origin = configuredAuthOrigins()[0];
	return origin ? new URL(origin).host : "";
}

function toOg(bytes: Buffer): Promise<Buffer> {
	return sharp(bytes)
		.resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover", position: "top" })
		.jpeg({ quality: 86, mozjpeg: true })
		.toBuffer();
}

async function paintTitleCard(
	id: TitleCardPage,
	locale: Locale,
): Promise<Buffer> {
	const [host, copy] = await Promise.all([getHost(), pageCopy(id, locale)]);
	const [first, ...rest] = songsFor(id, TILES + 1);
	const paths = [
		first ? getInfo.getill(first, "blur") : "",
		...rest.map((s) => getInfo.getill(s, "low")),
	];
	const local = await hydrateIlls(paths.filter(Boolean));
	const [backdrop, ...tiles] = paths.map((p) => {
		const file = local.get(p) ?? p;
		return file && exists(file) ? file : "";
	});
	const data: OgPageData = {
		brand: catalogs[locale].brand,
		...copy,
		host: siteHost(),
		accent: ACCENTS[hash(id) % ACCENTS.length] as string,
		backdrop: backdrop || undefined,
		tiles: tiles.filter(Boolean),
	};
	const img = await host.render(OG_PAGE_TEMPLATE, data, {
		signal: AbortSignal.timeout(PAINT_TIMEOUT_MS),
	});
	return toOg(img.bytes);
}

const titleCards = new Map<string, Promise<Buffer>>();

/** Painted once per instance and locale; a failed paint is forgotten so the next request tries again */
export function titleCardImage(
	id: TitleCardPage,
	locale: Locale,
): Promise<Buffer> {
	const key = `${id}|${locale}`;
	let job = titleCards.get(key);
	if (!job) {
		job = paintTitleCard(id, locale);
		titleCards.set(key, job);
		job.catch(() => titleCards.delete(key));
	}
	return job;
}

const cardCrops = new WeakMap<Buffer, Promise<Buffer>>();

/** The top of a card (player header, first rows), as the old static image framed it; cropped once per card */
export async function cardOgImage(
	userId: string,
	kind: CardKind,
	locale: Locale,
): Promise<Buffer | BoundErr> {
	const card = await renderCard(userId, kind, { locale });
	if ("error" in card) return card;
	let crop = cardCrops.get(card.bytes);
	if (!crop) {
		const bytes = card.bytes;
		crop = toOg(bytes);
		cardCrops.set(bytes, crop);
		crop.catch(() => cardCrops.delete(bytes));
	}
	return crop;
}

export function jpegResponse(bytes: Buffer, cacheControl: string): Response {
	return new Response(new Uint8Array(bytes), {
		headers: {
			"Content-Type": "image/jpeg",
			"Content-Length": String(bytes.byteLength),
			"Cache-Control": cacheControl,
		},
	});
}

export function ogRedirect(location: string): Response {
	return new Response(null, {
		status: 302,
		headers: { Location: location, "Cache-Control": FALLBACK_CACHE },
	});
}

/** The card when it is ready in time, else `fallback` while the paint finishes in the background */
export async function cardOgResponse(
	job: Promise<Buffer | BoundErr>,
	fallback: string,
): Promise<Response> {
	after(job.catch(() => undefined));
	const out = await withTimeout(job, CARD_WAIT_MS, "og card").catch(
		() => undefined,
	);
	return Buffer.isBuffer(out)
		? jpegResponse(out, CARD_CACHE)
		: ogRedirect(fallback);
}
