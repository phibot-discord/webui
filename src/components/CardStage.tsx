"use client";

import { useCallback, useId, useState } from "react";
import { CardViewer } from "@/components/CardViewer";
import { CountSelect } from "@/components/CountSelect";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { type CardStats, cardSource, formatDuration } from "@/lib/card-stats";
import { bumpCardReload } from "@/lib/save-refresh";
import { type CardKind, clampCount } from "@/server/card-kinds";
import {
	type PaintQuality,
	parsePaintQuality,
} from "@/server/render/paint-budget";

function withQuery(
	srcBase: string,
	opts: {
		count?: number;
		locale: string;
		quality: PaintQuality;
		tags?: boolean;
	},
) {
	const u = new URL(srcBase, "http://local.invalid");
	if (opts.count != null) u.searchParams.set("count", String(opts.count));
	u.searchParams.set("locale", opts.locale);
	u.searchParams.set("quality", opts.quality);
	if (opts.tags != null) u.searchParams.set("tags", opts.tags ? "1" : "0");
	return `${u.pathname}${u.search}`;
}

export function CardStage({
	kind,
	srcBase,
	counted,
	initialCount,
	tagProfile,
	initialQuality = "fast",
	persistQuality = false,
}: {
	kind: CardKind;
	srcBase: string;
	counted: boolean;
	initialCount: number;
	tagProfile?: { on: boolean };
	initialQuality?: PaintQuality;
	persistQuality?: boolean;
}) {
	const { locale, m } = useI18n();
	const [count, setCount] = useState(initialCount);
	const [quality, setQuality] = useState<PaintQuality>(
		parsePaintQuality(initialQuality),
	);
	const [tagsOn, setTagsOn] = useState(tagProfile?.on ?? true);
	const [stats, setStats] = useState<CardStats>();
	const [fileUrl, setFileUrl] = useState<string>();
	const query = {
		count: counted ? count : undefined,
		locale,
		quality,
		tags: tagProfile ? tagsOn : undefined,
	};
	const src = withQuery(srcBase, query);
	const title = m.card.titles[kind];

	const onCount = useCallback((next: number) => {
		const n = clampCount(String(next));
		setCount(n);
		const url = new URL(window.location.href);
		url.searchParams.set("count", String(n));
		window.history.replaceState(null, "", `${url.pathname}${url.search}`);
	}, []);

	const onQuality = useCallback(
		(next: PaintQuality) => {
			setQuality(next);
			const url = new URL(window.location.href);
			url.searchParams.set("quality", next);
			window.history.replaceState(null, "", `${url.pathname}${url.search}`);
			bumpCardReload();
			if (!persistQuality) return;
			void fetch("/api/notes", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ cardQuality: next }),
			});
		},
		[persistQuality],
	);

	return (
		<>
			<div className="toolbar">
				{counted ? <CountSelect value={count} onChange={onCount} /> : null}
				<QualitySelect value={quality} onChange={onQuality} />
				<CardStatsMenu stats={stats} />
				{tagProfile ? (
					<TagProfileToggle
						on={tagsOn}
						label={m.card.tagProfile}
						onChange={setTagsOn}
					/>
				) : null}
				<a
					className="btn btn-ghost"
					href={fileUrl}
					download={`${kind}.jpg`}
					aria-disabled={!fileUrl}
					onClick={(e) => {
						if (!fileUrl) e.preventDefault();
					}}
				>
					{m.card.download}
				</a>
			</div>
			<CardViewer
				src={src}
				alt={m.card.alt.replaceAll("{name}", title)}
				onStats={setStats}
				onFile={setFileUrl}
			/>
		</>
	);
}

function QualitySelect({
	value,
	onChange,
}: {
	value: PaintQuality;
	onChange: (next: PaintQuality) => void;
}) {
	const { m } = useI18n();
	return (
		<label className="field">
			{m.card.quality}
			<select
				value={value}
				onChange={(e) => onChange(parsePaintQuality(e.target.value))}
			>
				<option value="fast">{m.card.qualityFast}</option>
				<option value="high">{m.card.qualityHigh}</option>
			</select>
		</label>
	);
}

function TagProfileToggle({
	on,
	label,
	onChange,
}: {
	on: boolean;
	label: string;
	onChange: (next: boolean) => void;
}) {
	const [pending, setPending] = useState(false);

	async function toggle() {
		const next = !on;
		setPending(true);
		try {
			const res = await fetch("/api/notes", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ showTagAnalysis: next }),
			});
			if (!res.ok) return;
			onChange(next);
			bumpCardReload();
		} finally {
			setPending(false);
		}
	}

	return (
		<button
			className="btn btn-ghost"
			type="button"
			aria-pressed={on}
			disabled={pending}
			onClick={() => void toggle()}
		>
			{label}
		</button>
	);
}

function hitMiss(
	v: "hit" | "miss",
	card: Pick<Messages["card"], "statsHit" | "statsMiss">,
) {
	return v === "hit" ? card.statsHit : card.statsMiss;
}

function sourceLabel(
	source: ReturnType<typeof cardSource>,
	card: Pick<Messages["card"], "statsStoreR2" | "statsStoreKv" | "statsRender">,
) {
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
	ms(stats.totalMs, "server", card.statsServer, card.statsHintServer);
	ms(stats.waitMs, "wait", card.statsWait, card.statsHintWait);
	return rows;
}

function CardStatsMenu({ stats }: { stats?: CardStats }) {
	const { m } = useI18n();
	const tipId = useId();
	const hintId = useId();
	const card = m.card;
	const [hint, setHint] = useState<string>();
	const source = stats ? cardSource(stats) : undefined;
	const time = stats ? formatDuration(stats.waitMs ?? stats.totalMs) : "…";
	const label = source ? `${sourceLabel(source, card)} · ${time}` : time;
	const rows = stats ? statsRows(stats, card) : [];
	return (
		<div className="tool stats-tool" onMouseLeave={() => setHint(undefined)}>
			{stats ? (
				<button
					type="button"
					className="btn btn-ghost stats-chip"
					data-source={source}
					aria-label={label}
					aria-describedby={tipId}
					onKeyDown={(e) => {
						if (e.key === "Escape") e.currentTarget.blur();
					}}
				>
					<span className="stats-source">
						{source ? sourceLabel(source, card) : card.statsRender}
					</span>
					<span className="stats-time">{time}</span>
				</button>
			) : (
				<span className="btn btn-ghost stats-chip" aria-busy="true">
					<span className="stats-source">{card.statsRender}</span>
					<span className="stats-time">{time}</span>
				</span>
			)}
			{stats ? (
				<div className="stats-pops">
					<div
						className="tool-pop stats-pop"
						role="dialog"
						aria-label={card.stats}
						id={tipId}
					>
						<dl className="stats-rows">
							{rows.map((row) => (
								<div
									className="stats-row"
									key={row.key}
									tabIndex={0}
									data-active={hint === row.hint ? "true" : undefined}
									onMouseEnter={() => setHint(row.hint)}
									onFocus={() => setHint(row.hint)}
								>
									<dt>{row.label}</dt>
									<dd>{row.value}</dd>
								</div>
							))}
						</dl>
					</div>
					{hint ? (
						<p className="tool-pop stats-hint-pop" role="note" id={hintId}>
							{hint}
						</p>
					) : null}
				</div>
			) : null}
		</div>
	);
}
