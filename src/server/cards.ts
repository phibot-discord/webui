import type { CardStats } from "@/lib/card-stats";
import {
	isPhiLocale,
	type PhiLocale,
	resolvePhiLocale,
} from "@/phi/lib/card-i18n";
import {
	type CardStyle,
	cardStyleTemplate,
	DEFAULT_CARD_STYLE,
	isStyledKind,
	parseCardStyle,
} from "@/phi/lib/card-styles";
import { b19Card, infoCard } from "@/phi/lib/cards";
import { knownBackground } from "@/phi/lib/catalog";
import {
	buildUpdateCard,
	loadHisb30Snaps,
	loadSaveHistory,
	updateCardImages,
} from "@/phi/lib/history";
import { getNotes, type UserNotes } from "@/phi/lib/notes";
import type { Save } from "@/phi/lib/save";
import { buildSongCard } from "@/phi/lib/song-card";
import {
	type BoundErr,
	getCardEpoch,
	loadBound,
	resolveCardEpoch,
	saveRevision,
} from "./bound";
import {
	type CachedCard,
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
import {
	type CardKind,
	cardCacheKind,
	clampCount,
	parseSongLevel,
	type SongLevel,
} from "./card-kinds";
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
	/**
	 * Rendered with missing data (a lookup timed out) or with the classic layout
	 * after the chosen one failed: serve with no-store, never cache
	 */
	transient?: boolean;
	/** If-None-Match matched: answer 304; `bytes` is empty */
	notModified?: boolean;
	/** The UI locale saved in the user's notes, for the chrome-locale cookie */
	uiLocale?: PhiLocale;
};

const DATA_TIMEOUT_MS = 75_000;
const RENDER_TIMEOUT_MS = 45_000;

type CardRenderOpts = {
	count?: number;
	/** Explicit choice (query, Accept-Language, UI cookie); beats the notes locale */
	locale?: PhiLocale;
	/** Used when neither `locale` nor the notes locale is set */
	fallbackLocale?: PhiLocale;
	ifNoneMatch?: string | null;
	paintQuality?: PaintQuality;
	showTagAnalysis?: boolean;
	showRecordStats?: boolean;
	download?: boolean;
	epoch?: string;
	/** Layout style override (query); falls back to the user's saved choice */
	style?: string;
	/** Per-song card ("song" kind): chart id and level */
	chart?: string;
	level?: string;
	/** The client asked for a reload (its save just changed): skip the token/save memo */
	fresh?: boolean;
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
	style: CardStyle;
	song?: { chart: string; level: SongLevel };
	notes: Awaited<ReturnType<typeof getNotes>>;
	etag: string;
	key: string;
	heightId: string;
	/** The KV phase: session, token, save, notes and epoch */
	prepMs: number;
};

async function prepareCardCache(
	userId: string,
	kind: CardKind,
	opts: CardRenderOpts = {},
): Promise<CardPrep | BoundErr> {
	const started = performance.now();
	const [data] = await Promise.all([getDataHost(), ensureSongInfo()]);
	// The token/save memo the page view just seeded, unless the client's save
	// just changed (it then asks with Cache-Control: no-cache)
	const memo = { memo: !opts.fresh };
	let [bound, notes, epoch] = await Promise.all([
		loadBound(data, userId, memo),
		getNotes(data.db, userId),
		getCardEpoch(data.store, userId),
	]);
	if (
		"error" in bound &&
		(bound.error === "not_bound" || bound.error === "no_save")
	) {
		await new Promise((r) => setTimeout(r, 350));
		bound = await loadBound(data, userId, memo);
	}
	if ("error" in bound) return bound;
	const { save, token } = bound;
	const locale = resolvePhiLocale(
		opts.locale,
		notes.locale,
		opts.fallbackLocale,
	);
	const nnum = clampCount(opts.count != null ? String(opts.count) : "33");
	const paintQuality = parsePaintQuality(
		opts.paintQuality ?? notes.cardQuality,
	);
	notes.cardBackground = knownBackground(notes.cardBackground) || undefined;
	const tagOn = opts.showTagAnalysis ?? notes.showTagAnalysis !== false;
	const statsOn = opts.showRecordStats ?? notes.showRecordStats !== false;
	const style = parseCardStyle(
		kind,
		opts.style ?? (isStyledKind(kind) ? notes.cardStyle?.[kind] : undefined),
	);
	const song =
		kind === "song"
			? {
					chart: String(opts.chart || "").trim(),
					level: parseSongLevel(opts.level),
				}
			: undefined;
	if (song && !song.chart)
		return { error: "unknown_card", status: 404, reason: "unknown_card" };
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
		style,
		// Leaderboard numbers drift without a save change: re-render a song card daily
		extra: song
			? `song:${song.chart}:${song.level}:${new Date().toISOString().slice(0, 10)}`
			: undefined,
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
		style,
		song,
		notes,
		etag,
		key: cacheKey(cacheKind, userId, etag),
		heightId: cardEtag(cardCacheParts(cacheInput, "height")),
		prepMs: Math.round(performance.now() - started),
	};
}

function hitResult(prep: CardPrep, hit: CachedCard, cacheMs: number): RenderOk {
	return {
		bytes: hit.bytes,
		etag: prep.etag,
		mime: "image/jpeg",
		stats: {
			cache: "hit",
			store: durableCardStore(hit.store),
			prepMs: prep.prepMs,
			cacheMs,
			totalMs: Math.round(performance.now() - prep.started),
		},
	};
}

async function readCachedCard(prep: CardPrep): Promise<RenderOk | undefined> {
	const tCache = performance.now();
	let hit: CachedCard | undefined;
	try {
		hit = await readCachedPng(prep.data, prep.key);
	} catch (err) {
		// KV / R2 down: paint the card instead of failing every request waiting on it
		logger.warn(
			`card cache lookup failed, rendering: ${err instanceof Error ? err.message : err}`,
		);
		return;
	}
	const cacheMs = Math.round(performance.now() - tCache);
	if (!hit) return;
	logger.info(`card cache hit ${prep.kind} ${RENDER_VERSION} ${hit.store}`);
	return hitResult(prep, hit, cacheMs);
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
	const uiLocale = isPhiLocale(prep.notes.locale)
		? prep.notes.locale
		: undefined;
	if (!opts.download && etagMatches(opts.ifNoneMatch, prep.etag)) {
		return {
			bytes: Buffer.alloc(0),
			etag: prep.etag,
			notModified: true,
			uiLocale,
			stats: {
				cache: "hit",
				revalidated: true,
				prepMs: prep.prepMs,
				cacheMs: 0,
				totalMs: Math.round(performance.now() - prep.started),
			},
		};
	}
	const out = await sharedCard(prep);
	if ("error" in out) return out;
	return { ...out, uiLocale };
}

/** Identical cards being fetched or painted now: a second tab, the client's retry, bot + web */
const inflight = new Map<string, Promise<RenderOk | BoundErr>>();

async function sharedCard(prep: CardPrep): Promise<RenderOk | BoundErr> {
	const tMem = performance.now();
	const hot = await readCachedPng(prep.data, prep.key, { durable: false });
	if (hot) return hitResult(prep, hot, Math.round(performance.now() - tMem));
	let job = inflight.get(prep.key);
	const joined = job != null;
	if (!job) {
		job = lookupOrPaint(prep).finally(() => inflight.delete(prep.key));
		inflight.set(prep.key, job);
	}
	const tWait = performance.now();
	const out = await job;
	if (!joined || "error" in out) return out;
	return { ...out, stats: joinedStats(prep, out.stats, tWait) };
}

/** Stats for a request that joined another's render: its own prep, wait and total only */
function joinedStats(
	prep: CardPrep,
	theirs: CardStats,
	waitStarted: number,
): CardStats {
	return {
		cache: theirs.cache,
		store: theirs.store,
		shared: true,
		prepMs: prep.prepMs,
		cacheMs: Math.round(performance.now() - waitStarted),
		totalMs: Math.round(performance.now() - prep.started),
	};
}

async function lookupOrPaint(prep: CardPrep): Promise<RenderOk | BoundErr> {
	const tCache = performance.now();
	// Boot the render host only after a memory miss, once the durable lookup is in flight, so an R2 hit skips the wait
	const warmHost = new Promise<void>((resolve) => {
		setImmediate(() => {
			getHost().then(
				() => resolve(),
				() => resolve(),
			);
		});
	});
	const cached = await readCachedCard(prep);
	if (cached) return cached;
	logger.info(`card cache miss ${prep.kind} ${RENDER_VERSION}`);
	// Only a render needs the height; the read overlaps buildCardData
	const cachedHeight = settleable(
		readCachedHeight(prep.data.store, prep.heightId),
	);
	await warmHost;
	return paintFreshCard(
		prep,
		Math.round(performance.now() - tCache),
		cachedHeight,
	);
}

/**
 * Render options, plus an abort signal that fires with our own timeout so an
 * engine that accepts `signal` stops the abandoned work and frees its raster slot
 */
function renderOpts(prep: CardPrep, heightKey: string, height?: number) {
	return {
		paintQuality: prep.paintQuality,
		heightKey,
		height,
		signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
	};
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
				prep.style,
				prep.song,
			),
			DATA_TIMEOUT_MS,
			`${prep.kind}-data`,
		);
		const dataMs = Math.round(performance.now() - tData);
		if ("error" in built) return built;
		const height = cachedHeight.done
			? await cachedHeight.promise.catch(() => undefined)
			: undefined;
		let img: Awaited<ReturnType<typeof host.render>>;
		let fellBack = false;
		try {
			img = await withTimeout(
				host.render(
					built.templateId,
					built.data,
					renderOpts(prep, prep.heightId, height),
				),
				RENDER_TIMEOUT_MS,
				built.templateId,
			);
		} catch (err) {
			// A broken alternative layout must not cost the user their card
			if (built.templateId === built.classicTemplateId) throw err;
			logger.error(
				`render ${built.templateId} failed, using classic: ${err instanceof Error ? err.message : err}`,
			);
			fellBack = true;
			img = await withTimeout(
				host.render(
					built.classicTemplateId,
					built.data,
					renderOpts(prep, `${prep.heightId}:classic`),
				),
				RENDER_TIMEOUT_MS,
				built.classicTemplateId,
			);
		}
		// Fallback renders and renders missing data (a lookup timed out) are not
		// cached here, nor by the browser or CDN: the next request tries again
		const transient = fellBack || built.data.renderPartial === true;
		if (!transient) {
			await writeCachedPng(host, prep.key, img.bytes);
			if (!height && img.height > 64) {
				await writeCachedHeight(host.store, prep.heightId, img.height);
			}
		}
		const t = img.timings;
		return {
			bytes: img.bytes,
			etag: transient ? `${prep.etag}-p` : prep.etag,
			transient: transient || undefined,
			mime: img.mime ?? "image/jpeg",
			stats: {
				cache: "miss",
				prepMs: prep.prepMs,
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
	style: CardStyle = DEFAULT_CARD_STYLE,
	song?: { chart: string; level: SongLevel },
): Promise<
	| {
			templateId: string;
			/** The kind's original layout, used if the chosen style fails to render */
			classicTemplateId: string;
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
			templateId: cardStyleTemplate(kind, style) ?? "phi/b19/b19",
			classicTemplateId: "phi/b19/b19",
			data: {
				...data,
				hideRecordStats: !showRecordStats,
				cardKind: kind,
				cardStyle: style,
			},
		};
	}
	if (kind === "song") {
		const built = await buildSongCard(host.rt, save, host.db, catalog, {
			chart: song?.chart ?? "",
			level: song?.level ?? "AT",
			locale,
			notes,
		});
		if ("error" in built)
			return { error: built.error, status: built.status, reason: built.error };
		return {
			templateId: built.templateId,
			classicTemplateId: built.templateId,
			data: { ...built.data, theme: themeKey, locale, cardKind: kind },
		};
	}
	if (kind === "info") {
		const data = await infoCard(host.rt, save, host.db, userId, catalog, {
			locale,
			notes,
			token,
		});
		return {
			templateId: cardStyleTemplate(kind, style) ?? "phi/userinfo/userinfo",
			classicTemplateId: "phi/userinfo/userinfo",
			data: { ...data, cardKind: kind, cardStyle: style },
		};
	}
	// hisb30: the Discord bot's `/phi account update` card (score history by save date)
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
	const cardData = {
		...data,
		theme: themeKey,
		locale,
		cardKind: kind,
		cardStyle: style,
		// B30 snapshots ({t, rks, phi, b27}) for layouts that show entered / left charts
		hisb30Snaps: snaps,
	};
	// Jackets / grade icons start downloading while the template compiles
	prefetchIlls(updateCardImages(host.rt, cardData));
	return {
		templateId: cardStyleTemplate(kind, style) ?? "phi/update/update",
		classicTemplateId: "phi/update/update",
		data: cardData,
	};
}
