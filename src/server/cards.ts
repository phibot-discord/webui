import type { CardStats } from "@/lib/card-stats";
import { type PhiLocale, resolvePhiLocale } from "@/phi/lib/card-i18n";
import { b19Card, infoCard } from "@/phi/lib/cards";
import {
	buildHisb30Rows,
	loadHisb30Snaps,
	loadSaveHistory,
	playerBlock,
} from "@/phi/lib/history";
import { getNotes } from "@/phi/lib/notes";
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
import { type CardImageCacheInput, cardCacheParts } from "./card-image-cache";
import { type CardKind, clampCount } from "./card-kinds";
import { getDataHost } from "./data-host";
import { getHost, type WebHost } from "./host";
import { etagMatches } from "./http";
import { logger } from "./logger";
import { type PaintQuality, parsePaintQuality } from "./render/paint-budget";
import { withTimeout } from "./render-lock";
import { ensureSongInfo } from "./song-info";

export {
	CARD_KINDS,
	type CardKind,
	clampCount,
	isCardKind,
	isPublicKind,
	PUBLIC_KINDS,
	type PublicKind,
} from "./card-kinds";

export const RENDER_VERSION = "v32";

export {
	type BoundErr,
	type ErrorCode,
	lastSyncedIso,
	loadBound,
	REFRESH_COOLDOWN_MS,
	refreshCooldownRemaining,
	refreshSave,
	saveRevision,
} from "./bound";

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
	const [bound, notes, epoch] = await Promise.all([
		loadBound(data, userId),
		getNotes(data.db, userId),
		getCardEpoch(data.store, userId),
	]);
	if ("error" in bound) return bound;
	const { save, token } = bound;
	const locale = resolvePhiLocale(opts.locale, notes.locale);
	const nnum = clampCount(opts.count != null ? String(opts.count) : "33");
	const paintQuality = parsePaintQuality(
		opts.paintQuality ?? notes.cardQuality,
	);
	const tagOn = opts.showTagAnalysis ?? notes.showTagAnalysis !== false;
	const cacheInput: CardImageCacheInput = {
		kind,
		userId,
		saveRevision: saveRevision(save),
		locale: `locale:${locale}`,
		quality: paintQuality,
		epoch: resolveCardEpoch(opts.epoch, epoch),
		count: String(nnum),
		theme: notes.theme,
		renderVersion: RENDER_VERSION,
		analysisFlag: notes.showB30Analysis === false ? "a0" : "a1",
		tagFlag: tagOn ? "t1" : "t0",
	};
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
		notes,
		etag,
		key: cacheKey(kind, userId, etag),
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
	const cached = await readCachedCard(prep);
	if (cached) return cached;
	logger.info(`card cache miss ${kind} ${RENDER_VERSION}`);
	return paintFreshCard(prep, Math.round(performance.now() - tCache));
}

async function paintFreshCard(
	prep: CardPrep,
	cacheMs: number,
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
				prep.notes.theme,
				prep.tagOn,
			),
			60_000,
			`${prep.kind}-data`,
		);
		const dataMs = Math.round(performance.now() - tData);
		if ("error" in built) return built;
		const cachedHeight = await readCachedHeight(host.store, prep.heightId);
		const img = await withTimeout(
			host.render(built.templateId, built.data, {
				paintQuality: prep.paintQuality,
				heightKey: prep.heightId,
				height: cachedHeight,
			}),
			45_000,
			built.templateId,
		);
		await writeCachedPng(host, prep.key, img.bytes);
		if (!cachedHeight && img.height > 64) {
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
	theme: string,
	showTagAnalysis?: boolean,
): Promise<
	| {
			templateId: string;
			data: Record<string, unknown>;
	  }
	| BoundErr
> {
	const catalog = host.catalog;
	const themeKey = theme || "default";
	if (kind === "b30" || kind === "x30" || kind === "fc30") {
		const data = await b19Card(host.rt, save, host.db, userId, catalog, {
			nnum,
			mode: kind,
			locale,
			showTagAnalysis,
		});
		return { templateId: "phi/b19/b19", data };
	}
	if (kind === "info") {
		const data = await infoCard(host.rt, save, host.db, userId, catalog, {
			locale,
		});
		return { templateId: "phi/userinfo/userinfo", data };
	}
	const snaps = await loadHisb30Snaps(host.db, userId);
	const history = await loadSaveHistory(host.rt, host.db, token);
	const rows = await buildHisb30Rows(host.rt, history, snaps);
	if (!rows.length) {
		return { error: "hisb30_empty", status: 404, reason: "hisb30_empty" };
	}
	return {
		templateId: "phi/historyB30/historyB30",
		data: {
			rows,
			Date: save.saveInfo.summary?.updatedAt,
			gameuser: playerBlock(host.rt, save),
			background: catalog.randomIll("blur"),
			theme: themeKey,
			locale,
		},
	};
}
