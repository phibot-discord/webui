import type { CardStats } from "@/lib/card-stats";
import { type PhiLocale, resolvePhiLocale } from "@/phi/lib/card-i18n";
import { b19Card, infoCard } from "@/phi/lib/cards";
import {
	buildUpdateCard,
	loadHisb30Snaps,
	loadSaveHistory,
	updateCardImages,
} from "@/phi/lib/history";
import { getNotes, type UserNotes } from "@/phi/lib/notes";
import type { Save } from "@/phi/lib/save";
import {
	type BoundErr,
	getCardEpoch,
	loadBound,
	resolveCardEpoch,
	saveRevision,
} from "./bound";
import {
	cacheKey,
	cardEtag,
	durableCardStore,
	readCachedHeight,
	readCachedPng,
	writeCachedHeight,
	writeCachedPng,
} from "./cache";
import {
	cardCacheInput,
	cardCacheParts,
	RENDER_VERSION,
} from "./card-image-cache";
import { type CardKind, cardCacheKind, clampCount } from "./card-kinds";
import { getDataHost } from "./data-host";
import { getHost, type WebHost } from "./host";
import { etagMatches } from "./http";
import { prefetchIlls } from "./ill";
import { logger, withDiscordUid } from "./logger";
import { type PaintQuality, parsePaintQuality } from "./render/paint-budget";
import { withTimeout } from "./render-lock";
import { ensureSongInfo } from "./song-info";

export type { BoundErr, ErrorCode } from "./bound";
export {
	type CardKind,
	clampCount,
	isCardKind,
	isPublicKind,
	type PublicKind,
} from "./card-kinds";
export { RENDER_VERSION };

type RenderOk = {
	bytes: Buffer;
	etag: string;
	mime?: string;
	stats: CardStats;
};

type CardRenderOpts = {
	count?: number;
	locale?: PhiLocale;
	ifNoneMatch?: string | null;
	paintQuality?: PaintQuality;
	showTagAnalysis?: boolean;
	showRecordStats?: boolean;
	download?: boolean;
	epoch?: string;
};

type CardPrep = {
	started: number;
	data: Awaited<ReturnType<typeof getDataHost>>;
	userId: string;
	kind: CardKind;
	save: Save;
	token: string;
	locale: PhiLocale;
	nnum: number;
	paintQuality: PaintQuality;
	tagOn: boolean;
	statsOn: boolean;
	notes: Awaited<ReturnType<typeof getNotes>>;
	etag: string;
	key: string;
	heightId: string;
};

async function prepareCardCache(
	userId: string,
	kind: CardKind,
	opts: CardRenderOpts = {},
): Promise<CardPrep | BoundErr> {
	const started = performance.now();
	const [data] = await Promise.all([getDataHost(), ensureSongInfo()]);
	let [bound, notes, epoch] = await Promise.all([
		loadBound(data, userId),
		getNotes(data.db, userId),
		getCardEpoch(data.store, userId),
	]);
	if (
		"error" in bound &&
		(bound.error === "not_bound" || bound.error === "no_save")
	) {
		await new Promise((r) => setTimeout(r, 350));
		bound = await loadBound(data, userId);
	}
	if ("error" in bound) return bound;
	const { save, token } = bound;
	const locale = resolvePhiLocale(opts.locale, notes.locale);
	const nnum = clampCount(opts.count != null ? String(opts.count) : "33");
	const paintQuality = parsePaintQuality(
		opts.paintQuality ?? notes.cardQuality,
	);
	const tagOn = opts.showTagAnalysis ?? notes.showTagAnalysis !== false;
	const statsOn = opts.showRecordStats ?? notes.showRecordStats !== false;
	const cacheKind = cardCacheKind(kind);
	const cacheInput = cardCacheInput({
		kind: cacheKind,
		userId,
		saveRevision: saveRevision(save),
		locale,
		paintQuality,
		epoch: resolveCardEpoch(opts.epoch, epoch),
		count: nnum,
		notes,
		tagOn,
		statsOn,
	});
	const etag = cardEtag(cardCacheParts(cacheInput, "jpeg"));
	return {
		started,
		data,
		userId,
		kind,
		save,
		token,
		locale,
		nnum,
		paintQuality,
		tagOn,
		statsOn,
		notes,
		etag,
		key: cacheKey(cacheKind, userId, etag),
		heightId: cardEtag(cardCacheParts(cacheInput, "height")),
	};
}

async function readCachedCard(prep: CardPrep): Promise<RenderOk | undefined> {
	const tCache = performance.now();
	const hit = await readCachedPng(prep.data, prep.key);
	const cacheMs = Math.round(performance.now() - tCache);
	if (!hit) return;
	logger.info(`card cache hit ${prep.kind} ${RENDER_VERSION} ${hit.store}`);
	return {
		bytes: hit.bytes,
		etag: prep.etag,
		mime: "image/jpeg",
		stats: {
			cache: "hit",
			store: durableCardStore(hit.store),
			cacheMs,
			totalMs: Math.round(performance.now() - prep.started),
		},
	};
}

export async function renderCard(
	userId: string,
	kind: CardKind,
	opts: CardRenderOpts = {},
): Promise<RenderOk | BoundErr> {
	return withDiscordUid(userId, () => renderCardFor(userId, kind, opts));
}

async function renderCardFor(
	userId: string,
	kind: CardKind,
	opts: CardRenderOpts = {},
): Promise<RenderOk | BoundErr> {
	const prep = await prepareCardCache(userId, kind, opts);
	if ("error" in prep) return prep;
	if (!opts.download && etagMatches(opts.ifNoneMatch, prep.etag)) {
		return {
			bytes: Buffer.alloc(0),
			etag: prep.etag,
			stats: {
				cache: "hit",
				cacheMs: 0,
				totalMs: Math.round(performance.now() - prep.started),
			},
		};
	}
	const tCache = performance.now();
	const warmHost = getHost().catch(() => undefined);
	const cachedHeight = settleable(
		readCachedHeight(prep.data.store, prep.heightId),
	);
	const cached = await readCachedCard(prep);
	if (cached) return cached;
	logger.info(`card cache miss ${kind} ${RENDER_VERSION}`);
	await warmHost;
	return paintFreshCard(
		prep,
		Math.round(performance.now() - tCache),
		cachedHeight,
	);
}

type Settleable<T> = { promise: Promise<T>; done: boolean };

function settleable<T>(promise: Promise<T>): Settleable<T> {
	const out: Settleable<T> = { promise, done: false };
	promise.then(
		() => {
			out.done = true;
		},
		() => {
			out.done = true;
		},
	);
	return out;
}

async function paintFreshCard(
	prep: CardPrep,
	cacheMs: number,
	cachedHeight: Settleable<number | undefined>,
): Promise<RenderOk | BoundErr> {
	try {
		const host = await getHost();
		const tData = performance.now();
		const built = await withTimeout(
			buildCardData(
				host,
				prep.userId,
				prep.kind,
				prep.save,
				prep.token,
				prep.nnum,
				prep.locale,
				prep.notes,
				prep.tagOn,
				prep.statsOn,
			),
			75_000,
			`${prep.kind}-data`,
		);
		const dataMs = Math.round(performance.now() - tData);
		if ("error" in built) return built;
		const height = cachedHeight.done
			? await cachedHeight.promise.catch(() => undefined)
			: undefined;
		const img = await withTimeout(
			host.render(built.templateId, built.data, {
				paintQuality: prep.paintQuality,
				heightKey: prep.heightId,
				height,
			}),
			45_000,
			built.templateId,
		);
		await writeCachedPng(host, prep.key, img.bytes);
		if (!height && img.height > 64) {
			await writeCachedHeight(host.store, prep.heightId, img.height);
		}
		const t = img.timings;
		return {
			bytes: img.bytes,
			etag: prep.etag,
			mime: img.mime ?? "image/jpeg",
			stats: {
				cache: "miss",
				cacheMs,
				dataMs,
				htmlMs: t?.htmlMs != null ? Math.round(t.htmlMs) : undefined,
				assetsMs: t?.assetsMs != null ? Math.round(t.assetsMs) : undefined,
				measureMs: t?.measureMs != null ? Math.round(t.measureMs) : undefined,
				rasterMs: t?.rasterMs != null ? Math.round(t.rasterMs) : undefined,
				encodeMs: t?.encodeMs != null ? Math.round(t.encodeMs) : undefined,
				paintMs: t?.paintMs != null ? Math.round(t.paintMs) : undefined,
				heightCache: t?.heightCache,
				totalMs: Math.round(performance.now() - prep.started),
			},
		};
	} catch (err) {
		logger.error(
			`render ${prep.kind}: ${err instanceof Error ? err.message : err}`,
		);
		return { error: "render_failed", status: 504, reason: "render_failed" };
	}
}

async function buildCardData(
	host: WebHost,
	userId: string,
	kind: CardKind,
	save: Save,
	token: string,
	nnum: number,
	locale: PhiLocale,
	notes: UserNotes,
	showTagAnalysis?: boolean,
	showRecordStats = true,
): Promise<
	| {
			templateId: string;
			data: Record<string, unknown>;
	  }
	| BoundErr
> {
	const catalog = host.catalog;
	const themeKey = notes.theme || "default";
	if (kind === "b30" || kind === "x30" || kind === "fc30") {
		const data = await b19Card(host.rt, save, host.db, userId, catalog, {
			nnum,
			mode: kind,
			locale,
			showTagAnalysis,
			notes,
		});
		return {
			templateId: "phi/b19/b19",
			data: { ...data, hideRecordStats: !showRecordStats },
		};
	}
	if (kind === "info") {
		const data = await infoCard(host.rt, save, host.db, userId, catalog, {
			locale,
			notes,
			token,
		});
		return { templateId: "phi/userinfo/userinfo", data };
	}
	// hisb30: the Discord bot's `/phi account update` card (score history by save date).
	const [snaps, history] = await Promise.all([
		loadHisb30Snaps(host.db, userId),
		loadSaveHistory(host.rt, host.db, token),
	]);
	const data = await buildUpdateCard(
		host.rt,
		save,
		catalog,
		history,
		notes,
		snaps,
		{ locale },
	);
	// Jackets / grade icons start downloading while the template compiles.
	prefetchIlls(updateCardImages(host.rt, data));
	return {
		templateId: "phi/update/update",
		data: { ...data, theme: themeKey, locale },
	};
}
