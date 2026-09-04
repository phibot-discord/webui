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
import { type BoundErr, getCardEpoch, loadBound, saveRevision } from "./bound";
import {
	cacheKey,
	cardEtag,
	readCachedPng,
	renderTemplatePng,
	writeCachedPng,
} from "./cache";
import { type CardKind, clampCount } from "./card-kinds";
import { getHost, type WebHost } from "./host";
import { logger } from "./logger";
import { withTimeout } from "./render-lock";

export {
	CARD_KINDS,
	type CardKind,
	clampCount,
	isCardKind,
	isPublicKind,
	PUBLIC_KINDS,
	type PublicKind,
} from "./card-kinds";

export const RENDER_VERSION = "v19";

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

type RenderOk = { bytes: Buffer; etag: string };

export async function renderCard(
	userId: string,
	kind: CardKind,
	opts: { count?: number; locale?: PhiLocale } = {},
): Promise<RenderOk | BoundErr> {
	const host = await getHost();
	const bound = await loadBound(host, userId);
	if ("error" in bound) return bound;
	const { save, token } = bound;
	const notes = await getNotes(host.db, userId);
	const locale = resolvePhiLocale(opts.locale, notes.locale);
	const nnum = clampCount(opts.count != null ? String(opts.count) : "33");
	const epoch = await getCardEpoch(host.store, userId);
	const etag = cardEtag([
		kind,
		userId,
		saveRevision(save),
		epoch,
		notes.theme,
		String(nnum),
		locale,
		"png",
		RENDER_VERSION,
		notes.showB30Analysis === false ? "a0" : "a1",
		notes.allowApiUsage === false ? "api0" : "api1",
		notes.showTagAnalysis === false ? "t0" : "t1",
	]);
	const key = cacheKey(kind, userId, etag);
	const hit = await readCachedPng(host, key);
	if (hit) {
		logger.info(`card cache hit ${kind} ${RENDER_VERSION}`);
		return { bytes: hit, etag };
	}
	logger.info(`card cache miss ${kind} ${RENDER_VERSION}`);

	try {
		const built = await withTimeout(
			buildCardData(host, userId, kind, save, token, nnum, locale, notes.theme),
			25_000,
			`${kind}-data`,
		);
		if ("error" in built) return built;
		const bytes = await renderTemplatePng(host, built.templateId, built.data, {
			heightKey: built.heightKey
				? `${built.heightKey}|${RENDER_VERSION}|a${notes.showB30Analysis === false ? "0" : "1"}|t${notes.showTagAnalysis === false || notes.allowApiUsage === false ? "0" : "1"}`
				: undefined,
		});
		await writeCachedPng(host, key, bytes);
		return { bytes, etag };
	} catch (err) {
		logger.error(`render ${kind}: ${err instanceof Error ? err.message : err}`);
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
): Promise<
	| { templateId: string; data: Record<string, unknown>; heightKey?: string }
	| BoundErr
> {
	const catalog = host.catalog;
	const themeKey = theme || "default";
	if (kind === "b30" || kind === "x30" || kind === "fc30") {
		const data = await b19Card(host.rt, save, host.db, userId, catalog, {
			nnum,
			mode: kind,
			locale,
		});
		return {
			templateId: "phi/b19/b19",
			data,
			heightKey: `phi/b19/b19|${kind}|n${nnum}|${locale}|${themeKey}`,
		};
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
		heightKey: `phi/historyB30/historyB30|r${rows.length}|${locale}|${themeKey}`,
	};
}
