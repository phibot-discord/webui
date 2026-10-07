"use client";

import {
	ArrowSquareOut,
	ArrowsOut,
	CaretDown,
	DownloadSimple,
	ListMagnifyingGlass,
	ShareNetwork,
	SlidersHorizontal,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useId, useState } from "react";
import type { BackgroundOption } from "@/components/BackgroundPicker";
import { CardOptions, useNoteSetting } from "@/components/CardOptions";
import { type CardView, CardViewer } from "@/components/CardViewer";
import { useChartCatalog } from "@/components/ChartSearch";
import { defaultCardSize } from "@/components/card-shape";
import { SongPicker } from "@/components/SongPicker";
import { useI18n } from "@/i18n/provider";
import type { CardStats } from "@/lib/card-stats";
import { bumpCardReload } from "@/lib/save-refresh";
import type { CardStyle } from "@/phi/lib/card-styles";
import type { B30AvgKind } from "@/phi/lib/notes";
import {
	type CardKind,
	clampCount,
	SONG_LEVELS,
	type SongLevel,
} from "@/server/card-kinds";
import {
	type PaintQuality,
	parsePaintQuality,
} from "@/server/render/paint-budget";

/** Sets or drops one query parameter without a navigation */
function setParam(key: string, value: string | undefined) {
	const url = new URL(window.location.href);
	if (value === undefined) url.searchParams.delete(key);
	else url.searchParams.set(key, value);
	window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

/** File-name safe, keeping CJK and other letters */
function fileSafe(s: string) {
	return (
		s
			.replace(/[\\/:*?"<>|#%\s]+/g, "_")
			.replace(/^_+|_+$/g, "")
			.slice(0, 60) || "player"
	);
}

function today() {
	const d = new Date();
	const p = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type StageProps = {
	kind: CardKind;
	srcBase: string;
	/** Player name and RKS for the image's alt text and file name */
	player: string;
	rks: string;
	counted: boolean;
	initialCount: number;
	tagProfile?: { on: boolean };
	recordStats?: { on: boolean };
	initialQuality?: PaintQuality;
	/** Signed-in desk: choices are saved to the user's notes */
	persist?: boolean;
	backgrounds?: BackgroundOption[];
	initialBackground?: string;
	/** Layouts offered for this kind (first is the default) */
	styles?: readonly CardStyle[];
	initialStyle?: CardStyle;
	/** Peer comparison mode; omit to hide the setting */
	initialPeer?: B30AvgKind;
	/** Per-song rank card: chart id ("" until picked) and level */
	song?: { chart: string; level: SongLevel };
};

export function CardStage(props: StageProps) {
	if (props.song) return <SongStage {...props} song={props.song} />;
	return <StageBody {...props} />;
}

/** The song card: chart picker first, then the card once a chart is chosen */
function SongStage(
	props: StageProps & { song: { chart: string; level: SongLevel } },
) {
	const { m } = useI18n();
	const catalog = useChartCatalog();
	const [chart, setChart] = useState(props.song.chart);
	const [picked, setLevel] = useState(props.song.level);
	const song =
		catalog.status === "ready"
			? // Links may leave out the catalog's trailing ".0"
				catalog.list.find((s) => s.id === chart || s.id === `${chart}.0`)
			: undefined;
	// A link to a chart the catalog lacks would only fetch a 404
	const missing = Boolean(chart) && catalog.status === "ready" && !song;
	// A link's level the chart lacks: its hardest one instead
	const level =
		song && !song.charts[picked]
			? (SONG_LEVELS.findLast((l) => song.charts[l]) ?? picked)
			: picked;

	useEffect(() => {
		if (!missing) return;
		setParam("chart", undefined);
		setParam("level", undefined);
	}, [missing]);

	const onChange = useCallback((nextChart: string, nextLevel: SongLevel) => {
		setChart(nextChart);
		setLevel(nextLevel);
		setParam("chart", nextChart);
		setParam("level", nextLevel);
	}, []);

	return (
		<>
			<SongPicker
				catalog={catalog}
				song={song}
				chart={missing ? "" : chart}
				level={level}
				onChange={onChange}
			/>
			{chart && !missing ? (
				<StageBody
					{...props}
					song={{ chart, level }}
					songName={`${song?.song ?? chart} ${level}`}
					// The catalog checks the chart and level first, so a bad link
					// costs no render
					hold={catalog.status === "loading"}
				/>
			) : (
				<div className="card-empty">
					<ListMagnifyingGlass aria-hidden="true" size={36} />
					<h2>{missing ? m.card.songNotFoundTitle : m.card.songEmptyTitle}</h2>
					<p>{missing ? m.card.songNotFound : m.card.songEmpty}</p>
				</div>
			)}
		</>
	);
}

function StageBody({
	kind,
	srcBase,
	player,
	rks,
	counted,
	initialCount,
	tagProfile,
	recordStats,
	initialQuality = "fast",
	persist = false,
	backgrounds,
	initialBackground = "",
	styles,
	initialStyle = "classic",
	initialPeer,
	song,
	songName,
	hold,
}: StageProps & { songName?: string; hold?: boolean }) {
	const { locale, m } = useI18n();
	const panelId = useId();
	const summaryId = useId();
	const [open, setOpen] = useState(false);
	const [count, setCount] = useState(initialCount);
	const [stats, setStats] = useState<CardStats>();
	const [file, setFile] = useState<string>();
	const [view, setView] = useState<CardView>();
	const [zoomRequest, setZoomRequest] = useState(0);
	const [canShare, setCanShare] = useState(false);
	const [shareFile, setShareFile] = useState<File>();
	const [shareError, setShareError] = useState<string>();

	const save = <T,>(body: (v: T) => object) => (persist ? body : undefined);
	const style = useNoteSetting<CardStyle>(
		initialStyle,
		styles
			? save((s: CardStyle) => ({ cardStyle: { kind, style: s } }))
			: undefined,
		{ onApply: (s) => setParam("style", s) },
	);
	const quality = useNoteSetting<PaintQuality>(
		parsePaintQuality(initialQuality),
		save((q: PaintQuality) => ({ cardQuality: q })),
		{ onApply: (q) => setParam("quality", q) },
	);
	const tags = useNoteSetting(
		tagProfile?.on ?? true,
		save((on: boolean) => ({ showTagAnalysis: on })),
	);
	const recStats = useNoteSetting(
		recordStats?.on ?? true,
		save((on: boolean) => ({ showRecordStats: on })),
	);
	// The server reads these two from the notes, so the card reloads once saved
	const background = useNoteSetting(
		initialBackground,
		save((id: string) => ({ cardBackground: id })),
		{ onApply: () => bumpCardReload() },
	);
	const peer = useNoteSetting<B30AvgKind>(
		initialPeer ?? "all",
		save((k: B30AvgKind) => ({ b30AvgKind: k })),
		{ onApply: () => bumpCardReload() },
	);

	const onCount = useCallback((next: number) => {
		const n = clampCount(String(next));
		setCount(n);
		setParam("count", String(n));
	}, []);

	const u = new URL(srcBase, "http://local.invalid");
	if (counted) u.searchParams.set("count", String(count));
	u.searchParams.set("locale", locale);
	// Saved choices only: a setting that fails to save never costs a render
	u.searchParams.set("quality", quality.applied);
	if (tagProfile) u.searchParams.set("tags", tags.applied ? "1" : "0");
	if (recordStats) u.searchParams.set("stats", recStats.applied ? "1" : "0");
	if (styles) u.searchParams.set("style", style.applied);
	if (song) {
		u.searchParams.set("chart", song.chart);
		u.searchParams.set("level", song.level);
	}
	const src = `${u.pathname}${u.search}`;

	const titles: Partial<Record<CardKind, string>> = m.card.titles;
	const title = titles[kind] ?? kind;
	const name = songName
		? m.card.songTitle
				.replaceAll("{title}", title)
				.replaceAll("{song}", songName)
		: title;
	const alt = m.card.alt
		.replaceAll("{name}", name)
		.replaceAll("{player}", player)
		.replaceAll("{rks}", rks);
	const filename = [
		fileSafe(player),
		kind,
		styles && style.applied !== "classic" ? style.applied : "",
		song ? `${fileSafe(song.chart)}-${song.level}` : "",
		today(),
	]
		.filter(Boolean)
		.join("-")
		.concat(".jpg");
	const size =
		view?.width && view.height
			? m.card.size
					.replaceAll("{w}", String(view.width))
					.replaceAll("{h}", String(view.height))
			: "";
	const summary = [
		styles ? m.card.styleNames[style.applied] : "",
		counted ? `${m.card.charts} ${count}` : "",
		size,
	]
		.filter(Boolean)
		.join(" · ");
	const shape = styles ? style.applied : "classic";

	// Web Share with files: phones, and some desktop browsers
	useEffect(() => {
		try {
			const probe = new File([new Uint8Array(1)], "card.jpg", {
				type: "image/jpeg",
			});
			setCanShare(
				typeof navigator.canShare === "function" &&
					navigator.canShare({ files: [probe] }),
			);
		} catch {
			setCanShare(false);
		}
	}, []);

	// Build the File ahead of the tap: iOS only shares inside the tap's activation
	useEffect(() => {
		setShareFile(undefined);
		if (!canShare || !file) return;
		let dead = false;
		fetch(file)
			.then((res) => res.blob())
			.then((blob) => {
				if (!dead)
					setShareFile(new File([blob], filename, { type: "image/jpeg" }));
			})
			.catch(() => {});
		return () => {
			dead = true;
		};
	}, [canShare, file, filename]);

	async function share() {
		if (!shareFile) return;
		setShareError(undefined);
		try {
			await navigator.share({
				files: [shareFile],
				title: `${name} · ${player}`,
			});
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setShareError(m.card.shareFailed);
		}
	}

	return (
		<section className="card-stage" aria-labelledby={`${panelId}-h`}>
			<h2 className="sr-only" id={`${panelId}-h`}>
				{name}
			</h2>
			<div className="card-toolbar">
				<div className="card-toolbar-main">
					<button
						type="button"
						className="btn btn-ghost card-options-toggle"
						aria-expanded={open}
						aria-controls={panelId}
						aria-describedby={summary ? summaryId : undefined}
						onClick={() => setOpen((v) => !v)}
					>
						<SlidersHorizontal aria-hidden="true" size={18} />
						{m.card.options}
						<CaretDown className="btn-caret" aria-hidden="true" size={14} />
					</button>
					{summary ? (
						<span className="card-summary" id={summaryId}>
							{summary}
						</span>
					) : null}
				</div>
				<div className="card-actions">
					<button
						type="button"
						className="btn btn-ghost card-view-action"
						aria-haspopup="dialog"
						aria-disabled={!view || undefined}
						title={m.card.zoom}
						onClick={() => {
							if (view) setZoomRequest((n) => n + 1);
						}}
					>
						<ArrowsOut aria-hidden="true" size={18} />
						<span className="btn-label">{m.card.fullScreen}</span>
					</button>
					{view ? (
						<a
							className="btn btn-ghost card-view-action"
							href={view.url}
							target="_blank"
							rel="noopener"
							title={size ? `${m.card.openFull} · ${size}` : m.card.openFull}
						>
							<ArrowSquareOut aria-hidden="true" size={18} />
							<span className="btn-label">{m.card.original}</span>
						</a>
					) : (
						<button
							type="button"
							className="btn btn-ghost card-view-action"
							aria-disabled="true"
							title={m.card.openFull}
						>
							<ArrowSquareOut aria-hidden="true" size={18} />
							<span className="btn-label">{m.card.original}</span>
						</button>
					)}
					<span className="card-actions-sep" aria-hidden="true" />
					{file ? (
						<a className="btn btn-ghost" href={file} download={filename}>
							<DownloadSimple aria-hidden="true" size={18} />
							<span className="btn-label">{m.card.download}</span>
						</a>
					) : (
						<button
							type="button"
							className="btn btn-ghost"
							aria-disabled="true"
						>
							<DownloadSimple aria-hidden="true" size={18} />
							<span className="btn-label">{m.card.download}</span>
						</button>
					)}
					{canShare ? (
						<button
							type="button"
							className="btn btn-ghost"
							aria-disabled={!shareFile || undefined}
							onClick={() => void share()}
						>
							<ShareNetwork aria-hidden="true" size={18} />
							<span className="btn-label">{m.card.share}</span>
						</button>
					) : null}
				</div>
			</div>
			{shareError ? (
				<p className="field-error card-share-error" role="alert">
					{shareError}
				</p>
			) : null}
			<div className="card-options-panel" id={panelId} hidden={!open}>
				<CardOptions
					kind={kind}
					styles={styles}
					style={style}
					count={counted ? count : undefined}
					onCount={counted ? onCount : undefined}
					quality={quality}
					backgrounds={persist ? backgrounds : undefined}
					background={persist && backgrounds ? background : undefined}
					tags={tagProfile ? tags : undefined}
					recordStats={recordStats ? recStats : undefined}
					peer={persist && initialPeer ? peer : undefined}
					stats={stats}
					diagnostics={persist}
				/>
			</div>
			<CardViewer
				src={src}
				alt={alt}
				name={name}
				sizeKey={`${kind}:${shape}:${counted ? count : ""}`}
				defaultSize={defaultCardSize(kind, shape)}
				hold={hold}
				onStats={setStats}
				onFile={setFile}
				onView={setView}
				zoomRequest={zoomRequest}
			/>
		</section>
	);
}
