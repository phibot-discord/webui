"use client";

import { CaretRight } from "@phosphor-icons/react";
import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import {
	type BackgroundOption,
	BackgroundPicker,
} from "@/components/BackgroundPicker";
import { CountSelect } from "@/components/CountSelect";
import { OptStatus, SegRadio } from "@/components/SegRadio";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { type CardStats, cardSource, formatDuration } from "@/lib/card-stats";
import type { CardStyle } from "@/phi/lib/card-styles";
import type { B30AvgKind, RankBandShow, RankScope } from "@/phi/lib/notes";
import type { CardKind } from "@/server/card-kinds";
import type { PaintQuality } from "@/server/render/paint-budget";

export const PEER_KINDS = [
	"none",
	"all",
	"top",
	"rank",
] as const satisfies readonly B30AvgKind[];

export const RANK_SCOPE_KINDS = [
	"all",
	"band",
	"both",
] as const satisfies readonly RankScope[];

export const RANK_BAND_SHOW_KINDS = [
	"place",
	"percent",
] as const satisfies readonly RankBandShow[];

async function saveNotes(body: object): Promise<boolean> {
	try {
		const res = await fetch("/api/notes", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		return res.ok;
	} catch {
		return false;
	}
}

export type NoteSetting<T> = {
	value: T;
	applied: T;
	set: (next: T) => void;
	pending: boolean;
	failed: boolean;
};

export function useNoteSetting<T>(
	initial: T,
	toBody: ((next: T) => object) | undefined,
	opts: { onApply?: (next: T) => void } = {},
): NoteSetting<T> {
	const [value, setValue] = useState(initial);
	const [applied, setApplied] = useState(initial);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);
	const saved = useRef(initial);
	const seq = useRef(0);
	const live = useRef({ toBody, ...opts });
	live.current = { toBody, ...opts };

	const set = useCallback((next: T) => {
		setValue(next);
		setFailed(false);
		const apply = () => {
			saved.current = next;
			setApplied(next);
			live.current.onApply?.(next);
		};
		const body = live.current.toBody;
		if (!body) {
			apply();
			return;
		}
		const id = ++seq.current;
		setPending(true);
		void saveNotes(body(next)).then((ok) => {
			if (id !== seq.current) return;
			setPending(false);
			if (ok) {
				apply();
				return;
			}
			setFailed(true);
			setValue(saved.current);
		});
	}, []);

	return { value, applied, set, pending, failed };
}

function hitMiss(
	v: "hit" | "miss",
	card: Pick<Messages["card"], "statsHit" | "statsMiss">,
) {
	return v === "hit" ? card.statsHit : card.statsMiss;
}

export function sourceLabel(
	source: ReturnType<typeof cardSource>,
	card: Pick<
		Messages["card"],
		"statsStoreR2" | "statsStoreKv" | "statsStoreBrowser" | "statsRender"
	>,
) {
	if (source === "browser") return card.statsStoreBrowser;
	if (source === "kv") return card.statsStoreKv;
	if (source === "render") return card.statsRender;
	return card.statsStoreR2;
}

type StatsRow = { key: string; label: string; value: string; hint: string };

function statsRows(stats: CardStats, card: Messages["card"]): StatsRow[] {
	const source = cardSource(stats);
	const cacheValue =
		stats.cache === "miss"
			? card.statsMiss
			: `${card.statsHit} · ${sourceLabel(source, card)}`;
	const rows: StatsRow[] = [
		{
			key: "cache",
			label: card.statsCache,
			value: cacheValue,
			hint: card.statsHintCache,
		},
	];
	if (stats.heightCache) {
		rows.push({
			key: "height",
			label: card.statsHeight,
			value: hitMiss(stats.heightCache, card),
			hint: card.statsHintHeight,
		});
	}
	const ms = (
		n: number | undefined,
		key: string,
		label: string,
		hint: string,
	) => {
		if (n != null) rows.push({ key, label, value: formatDuration(n), hint });
	};
	ms(stats.cacheMs, "lookup", card.statsLookup, card.statsHintLookup);
	ms(stats.dataMs, "data", card.statsData, card.statsHintData);
	ms(stats.htmlMs, "html", card.statsHtml, card.statsHintHtml);
	ms(stats.assetsMs, "assets", card.statsAssets, card.statsHintAssets);
	ms(stats.measureMs, "measure", card.statsMeasure, card.statsHintMeasure);
	ms(stats.rasterMs, "raster", card.statsRaster, card.statsHintRaster);
	ms(stats.encodeMs, "encode", card.statsEncode, card.statsHintEncode);
	ms(stats.paintMs, "paint", card.statsPaint, card.statsHintPaint);
	ms(stats.extMs, "external", card.statsExternal, card.statsHintExternal);
	ms(stats.totalMs, "server", card.statsServer, card.statsHintServer);
	ms(stats.waitMs, "wait", card.statsWait, card.statsHintWait);
	return rows;
}

function Diagnostics({ stats }: { stats?: CardStats }) {
	const { m } = useI18n();
	const card = m.card;
	const source = stats ? cardSource(stats) : undefined;
	const time = stats ? formatDuration(stats.waitMs ?? stats.totalMs) : "…";
	return (
		<details className="opt opt-diag">
			<summary>
				<CaretRight className="opt-diag-caret" aria-hidden="true" size={14} />
				<span>{card.diagnostics}</span>
				<span className="stats-chip" data-source={source}>
					{source ? (
						<span className="stats-source">{sourceLabel(source, card)}</span>
					) : null}
					<span className="stats-time">{time}</span>
					{stats?.extMs ? (
						<span className="stats-ext">
							{card.statsExternal} {formatDuration(stats.extMs)}
						</span>
					) : null}
				</span>
			</summary>
			{stats ? (
				<dl className="stats-rows">
					{statsRows(stats, card).map((row) => (
						<div className="stats-row" key={row.key}>
							<dt>{row.label}</dt>
							<dd className="stats-value">{row.value}</dd>
							<dd className="stats-hint">{row.hint}</dd>
						</div>
					))}
				</dl>
			) : null}
		</details>
	);
}

export function CardOptions({
	kind,
	styles,
	style,
	count,
	onCount,
	quality,
	backgrounds,
	background,
	tags,
	recordStats,
	peer,
	rankScope,
	rankBandShow,
	peerWait,
	stats,
	diagnostics = false,
	extra,
}: {
	kind: CardKind;
	styles?: readonly CardStyle[];
	style: NoteSetting<CardStyle>;
	count?: number;
	onCount?: (next: number) => void;
	quality: NoteSetting<PaintQuality>;
	backgrounds?: BackgroundOption[];
	background?: NoteSetting<string>;
	tags?: NoteSetting<boolean>;
	recordStats?: NoteSetting<boolean>;
	peer?: NoteSetting<B30AvgKind>;
	rankScope?: NoteSetting<RankScope>;
	rankBandShow?: NoteSetting<RankBandShow>;
	peerWait?: NoteSetting<boolean>;
	stats?: CardStats;
	diagnostics?: boolean;
	extra?: ReactNode;
}) {
	const { m } = useI18n();
	const card = m.card;
	const waitNoteId = useId();
	const saving = (s?: { pending: boolean }) =>
		s?.pending ? card.optionsSaving : undefined;
	const failed = (s?: { failed: boolean }) =>
		s?.failed ? card.saveFailed : undefined;
	const history = kind === "hisb30";
	const peerValue: B30AvgKind = peer
		? (PEER_KINDS as readonly string[]).includes(peer.value)
			? peer.value
			: "all"
		: "none";

	return (
		<div className="card-options">
			{styles && styles.length > 1 ? (
				<SegRadio
					legend={card.style}
					className="opt-wide"
					cards
					value={style.value}
					status={saving(style)}
					error={style.failed ? card.styleFailed : undefined}
					options={styles.map((s) => ({
						value: s,
						label: card.styleNames[s],
						hint:
							s !== "classic"
								? card.styleHints[s]
								: history
									? card.styleHints.classicHistory
									: kind === "info"
										? card.styleHints.classicInfo
										: card.styleHints.classic,
					}))}
					onChange={style.set}
				/>
			) : null}
			{count != null && onCount ? (
				<CountSelect value={count} onChange={onCount} />
			) : null}
			<SegRadio
				legend={card.quality}
				value={quality.value}
				status={saving(quality)}
				error={failed(quality)}
				options={[
					{ value: "fast", label: card.qualityFast },
					{ value: "high", label: card.qualityHigh },
				]}
				onChange={quality.set}
			/>
			{peer ? (
				<SegRadio
					legend={card.peer}
					className="opt-peer"
					value={peerValue}
					status={saving(peer)}
					error={failed(peer)}
					note={card.peerHints[peerValue]}
					options={PEER_KINDS.map((k) => ({
						value: k,
						label: card.peerNames[k],
					}))}
					onChange={peer.set}
				/>
			) : null}
			{peer && rankScope && peerValue === "rank" ? (
				<SegRadio
					legend={card.rankScope}
					className="opt-peer"
					value={rankScope.value}
					status={saving(rankScope)}
					error={failed(rankScope)}
					note={card.rankScopeHints[rankScope.value]}
					options={RANK_SCOPE_KINDS.map((k) => ({
						value: k,
						label: card.rankScopeNames[k],
					}))}
					onChange={rankScope.set}
				/>
			) : null}
			{peer &&
			rankScope &&
			rankBandShow &&
			peerValue === "rank" &&
			rankScope.value !== "all" ? (
				<SegRadio
					legend={card.rankBandShow}
					className="opt-peer"
					value={rankBandShow.value}
					status={saving(rankBandShow)}
					error={failed(rankBandShow)}
					note={card.rankBandShowHints[rankBandShow.value]}
					options={RANK_BAND_SHOW_KINDS.map((k) => ({
						value: k,
						label: card.rankBandShowNames[k],
					}))}
					onChange={rankBandShow.set}
				/>
			) : null}
			{peer && peerWait && peerValue !== "none" ? (
				<fieldset className="opt" aria-describedby={waitNoteId}>
					<legend className="opt-label">
						{card.peerWaitLegend}
						<OptStatus>{saving(peerWait)}</OptStatus>
					</legend>
					<div className="opt-checks">
						<label className="opt-check">
							<input
								type="checkbox"
								checked={peerWait.value}
								onChange={(e) => peerWait.set(e.target.checked)}
							/>
							{card.peerWait}
						</label>
					</div>
					<p className="opt-note" id={waitNoteId}>
						{card.peerWaitHint}
					</p>
					{peerWait.failed ? (
						<p className="field-error opt-error" role="alert">
							{card.saveFailed}
						</p>
					) : null}
				</fieldset>
			) : null}
			{tags || recordStats ? (
				<fieldset className="opt">
					<legend className="opt-label">
						{card.show}
						<OptStatus>
							{tags?.pending || recordStats?.pending
								? card.optionsSaving
								: undefined}
						</OptStatus>
					</legend>
					<div className="opt-checks">
						{tags ? (
							<label className="opt-check">
								<input
									type="checkbox"
									checked={tags.value}
									onChange={(e) => tags.set(e.target.checked)}
								/>
								{card.tagProfile}
							</label>
						) : null}
						{recordStats ? (
							<label className="opt-check">
								<input
									type="checkbox"
									checked={recordStats.value}
									onChange={(e) => recordStats.set(e.target.checked)}
								/>
								{card.recordStats}
							</label>
						) : null}
					</div>
					{tags?.failed || recordStats?.failed ? (
						<p className="field-error opt-error" role="alert">
							{card.saveFailed}
						</p>
					) : null}
				</fieldset>
			) : null}
			{backgrounds && background ? (
				<BackgroundPicker
					options={backgrounds}
					value={background.value}
					onChange={background.set}
					status={saving(background)}
					error={failed(background)}
				/>
			) : null}
			{extra}
			{diagnostics ? <Diagnostics stats={stats} /> : null}
		</div>
	);
}
