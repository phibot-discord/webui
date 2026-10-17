"use client";

import {
	ArrowSquareOut,
	CaretDown,
	DownloadSimple,
	WarningCircle,
} from "@phosphor-icons/react";
import {
	Fragment,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useChartCatalog } from "@/components/ChartSearch";
import { Announce, useSettled } from "@/components/Tool";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { readRefreshToken, refreshedVersion } from "@/lib/asset-refresh";
import {
	ASSET_KINDS,
	ASSET_TABS,
	type AssetFile,
	type AssetFilter,
	type AssetKind,
	type AssetTab,
	assetCanPreview,
	assetExt,
	assetKind,
	assetTab,
	assetThumbKey,
	chartJsonOf,
	formatSize,
	packOf,
	publicAssetUrl,
} from "@/lib/assets";
import {
	bareId,
	type ChartSummary,
	type PackLevelName,
} from "@/lib/chart-catalog";
import { looseFold, rankSongs } from "@/lib/song-search";

const PAGE = 48;
const ART_KINDS = new Set(["jacket", "low", "blur", "music"]);
const TEXT_PREVIEW_MAX = 200_000;

type Row = {
	file: AssetFile;
	folded: string;
	tab: AssetTab;
	kind: AssetKind;
	song: ChartSummary | undefined;
	level: PackLevelName | undefined;
};

function rowOf(file: AssetFile, songs: Map<string, ChartSummary>): Row {
	const chart = packOf(file.key) ?? chartJsonOf(file.key);
	const stem =
		chart?.stem ??
		(file.key.split("/").pop() ?? file.key).replace(/\.[^.]+$/, "");
	return {
		file,
		folded: looseFold(file.key),
		tab: assetTab(file.key),
		kind: assetKind(file.key),
		song: songs.get(stem) ?? songs.get(`${stem}.0`),
		level: chart?.level,
	};
}

function Preview({
	src,
	label,
	file,
	t,
}: {
	src: string;
	label: string;
	file: AssetFile;
	t: Messages["files"];
}) {
	const [broken, setBroken] = useState(false);
	const kind = assetCanPreview(file.key);
	if (broken)
		return (
			<p className="asset-error" role="alert">
				<WarningCircle size={16} weight="fill" aria-hidden />
				{t.previewFailed}
			</p>
		);
	if (kind === "image")
		return (
			// biome-ignore lint/performance/noImgElement: arbitrary R2 object, not a known static asset
			<img
				className="asset-preview-img"
				src={src}
				alt={label}
				decoding="async"
				onError={() => setBroken(true)}
			/>
		);
	if (kind === "audio")
		return (
			// biome-ignore lint/a11y/useMediaCaption: game music, there are no captions to offer
			<audio
				className="asset-preview-audio"
				src={src}
				aria-label={label}
				controls
				autoPlay
				preload="auto"
				onError={() => setBroken(true)}
			/>
		);
	if (kind === "video")
		return (
			// biome-ignore lint/a11y/useMediaCaption: game video, there are no captions to offer
			<video
				className="asset-preview-video"
				src={src}
				aria-label={label}
				controls
				autoPlay
				playsInline
				preload="metadata"
				onError={() => setBroken(true)}
			/>
		);
	if (kind === "text" && file.size > TEXT_PREVIEW_MAX)
		return <p className="asset-note">{t.tooBig}</p>;
	if (kind === "text")
		return (
			<iframe
				className="asset-preview-text"
				title={label}
				src={src}
				sandbox=""
			/>
		);
	return null;
}

function KeyPath({ value }: { value: string }) {
	const parts = value.split(/(?<=[/._-])/);
	return parts.map((part, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: fixed split of one string
		<Fragment key={i}>
			{part}
			{i < parts.length - 1 ? <wbr /> : null}
		</Fragment>
	));
}

function Thumb({ src, ext }: { src: string | undefined; ext: string }) {
	const [broken, setBroken] = useState(false);
	if (!src || broken)
		return (
			<span className="asset-ext" aria-hidden="true">
				{ext}
			</span>
		);
	return (
		// biome-ignore lint/performance/noImgElement: arbitrary R2 object, not a known static asset
		<img
			className="asset-thumb"
			alt=""
			src={src}
			width={72}
			height={72}
			loading="lazy"
			decoding="async"
			onError={() => setBroken(true)}
		/>
	);
}

export function AssetBrowser({
	sides = [],
	t,
}: {
	sides?: readonly AssetTab[];
	t: Messages["files"];
}) {
	const { m } = useI18n();
	const catalog = useChartCatalog(true);
	const ids = useId();
	const searchId = `${ids}-search`;
	const panelId = `${ids}-panel`;
	const tabId = (id: AssetTab) => `${ids}-tab-${id}`;
	const [base, setBase] = useState<string | undefined>();
	const [files, setFiles] = useState<AssetFile[] | undefined>();
	const [failed, setFailed] = useState(false);
	const [attempt, setAttempt] = useState(0);
	const [query, setQuery] = useState("");
	const [kind, setKind] = useState<AssetFilter>("all");
	const [pickedTab, setPickedTab] = useState<AssetTab>("files");
	const [limit, setLimit] = useState(PAGE);
	const [open, setOpen] = useState<string | undefined>();
	const listRef = useRef<HTMLUListElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const stateRef = useRef<HTMLDivElement>(null);
	const retried = useRef(false);
	const focusRow = useRef<number | undefined>(undefined);

	useEffect(() => {
		const ac = new AbortController();
		setFailed(false);
		if (retried.current) stateRef.current?.focus();
		fetch(`/api/assets${attempt ? `?r=${attempt}` : ""}`, {
			signal: ac.signal,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				return (await res.json()) as { base?: string; files: AssetFile[] };
			})
			.then((body) => {
				if (ac.signal.aborted) return;
				if (!body.base) throw new Error("no public base");
				setBase(body.base);
				setFiles(body.files);
			})
			.catch((err: unknown) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				if (!ac.signal.aborted) setFailed(true);
			});
		return () => ac.abort();
	}, [attempt]);

	const [refreshToken, setRefreshToken] = useState<string | undefined>();
	useEffect(() => setRefreshToken(readRefreshToken()), []);
	const refreshed = (version: string | undefined) =>
		refreshedVersion(version, refreshToken);
	const versionOf = useMemo(() => {
		const map = new Map<string, string>();
		for (const file of files ?? []) if (file.v) map.set(file.key, file.v);
		return map;
	}, [files]);

	const songs = useMemo(() => {
		const map = new Map<string, ChartSummary>();
		if (catalog.status !== "ready") return map;
		for (const song of catalog.list) {
			map.set(song.id, song);
			map.set(bareId(song.id), song);
			if (song.stem) map.set(song.stem, song);
		}
		return map;
	}, [catalog]);

	const rows = useMemo(
		() => (files ?? []).map((file) => rowOf(file, songs)),
		[files, songs],
	);

	const tabs = useMemo(
		() =>
			ASSET_TABS.filter(
				(id) =>
					id === "files" ||
					(files ? rows.some((row) => row.tab === id) : sides.includes(id)),
			),
		[files, rows, sides],
	);
	const hasTabs = tabs.length > 1;
	const tab: AssetTab = tabs.includes(pickedTab) ? pickedTab : "files";
	const present = useMemo(
		() => new Set(rows.flatMap((row) => (row.tab === tab ? [row.kind] : []))),
		[rows, tab],
	);

	const trimmed = query.trim();
	const q = looseFold(trimmed);
	const named = useMemo(
		() =>
			catalog.status === "ready" && trimmed
				? new Set(
						rankSongs(catalog.list, trimmed, { limit: 40 }).map(
							(hit) => hit.song.id,
						),
					)
				: undefined,
		[catalog, trimmed],
	);
	const queried = useMemo(
		() =>
			rows.filter((row) => {
				if (!q || row.folded.includes(q)) return true;
				return row.song ? (named?.has(row.song.id) ?? false) : false;
			}),
		[rows, q, named],
	);
	const tabCounts = useMemo(() => {
		const out = Object.fromEntries(ASSET_TABS.map((id) => [id, 0])) as Record<
			AssetTab,
			number
		>;
		for (const row of queried) out[row.tab] += 1;
		return out;
	}, [queried]);
	const matched = useMemo(
		() => queried.filter((row) => row.tab === tab),
		[queried, tab],
	);
	const counts = useMemo(() => {
		const out: Partial<Record<AssetFilter, number>> = { all: matched.length };
		for (const row of matched) out[row.kind] = (out[row.kind] ?? 0) + 1;
		return out;
	}, [matched]);
	const hits = useMemo(
		() =>
			kind === "all" ? matched : matched.filter((row) => row.kind === kind),
		[matched, kind],
	);
	const shown = hits.slice(0, limit);
	const more = Math.min(PAGE, hits.length - shown.length);

	const resetPage = useCallback(() => {
		setLimit(PAGE);
		setOpen(undefined);
	}, []);

	const pickTab = (next: AssetTab) => {
		if (next === tab) return;
		setPickedTab(next);
		setKind("all");
		resetPage();
	};

	const onTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const at = tabs.indexOf(tab);
		const next =
			event.key === "ArrowRight"
				? tabs[(at + 1) % tabs.length]
				: event.key === "ArrowLeft"
					? tabs[(at + tabs.length - 1) % tabs.length]
					: event.key === "Home"
						? tabs[0]
						: event.key === "End"
							? tabs[tabs.length - 1]
							: undefined;
		if (!next) return;
		event.preventDefault();
		pickTab(next);
		document.getElementById(tabId(next))?.focus();
	};

	const count = files
		? hits.length
			? t.matches
					.replaceAll("{shown}", String(shown.length))
					.replaceAll("{total}", String(hits.length))
			: t.none
		: "";
	const said = useSettled(count);

	useEffect(() => {
		if (!files || !retried.current) return;
		retried.current = false;
		const active = document.activeElement;
		if (!active || active === document.body) searchRef.current?.focus();
	}, [files]);

	useEffect(() => {
		const row = focusRow.current;
		if (row == null) return;
		focusRow.current = undefined;
		listRef.current?.children[row]
			?.querySelector<HTMLElement>("button, a")
			?.focus();
	});

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<section className="callout asset-browser">
				{hasTabs ? (
					<div
						className="asset-tabs"
						role="tablist"
						aria-label={t.tabsLabel}
						onKeyDown={onTabKeyDown}
					>
						{tabs.map((id) => (
							<button
								key={id}
								id={tabId(id)}
								type="button"
								role="tab"
								aria-selected={tab === id}
								aria-controls={panelId}
								tabIndex={tab === id ? 0 : -1}
								onClick={() => pickTab(id)}
							>
								{t.tabs[id]}
								{files ? (
									<span className="asset-kind-count"> {tabCounts[id]}</span>
								) : null}
							</button>
						))}
					</div>
				) : null}
				<div
					{...(hasTabs
						? {
								id: panelId,
								role: "tabpanel",
								"aria-labelledby": tabId(tab),
							}
						: {})}
				>
					<div className="field field-col asset-search-field">
						<label className="field-label" htmlFor={searchId}>
							{t.searchLabel}
						</label>
						<input
							ref={searchRef}
							id={searchId}
							className="asset-search"
							type="search"
							autoComplete="off"
							spellCheck={false}
							value={query}
							placeholder={t.searchPlaceholder}
							disabled={!files}
							onChange={(event) => {
								setQuery(event.target.value);
								resetPage();
							}}
						/>
					</div>
					{files?.length ? (
						<fieldset className="asset-kinds">
							<legend>{t.kindLabel}</legend>
							{ASSET_KINDS.filter(
								(id) => id === "all" || id === kind || present.has(id),
							).map((id) => (
								<button
									key={id}
									type="button"
									aria-pressed={kind === id}
									onClick={() => {
										setKind(id);
										resetPage();
									}}
								>
									{t.kinds[id]}
									<span className="asset-kind-count"> {counts[id] ?? 0}</span>
								</button>
							))}
						</fieldset>
					) : null}

					{failed || !files ? (
						<div className="asset-state" ref={stateRef} tabIndex={-1}>
							{failed ? (
								<div className="asset-failed" role="alert">
									<p>
										<WarningCircle size={18} weight="fill" aria-hidden />
										{t.failed}
									</p>
									<button
										type="button"
										className="btn btn-ghost btn-sm"
										onClick={() => {
											retried.current = true;
											setFailed(false);
											setAttempt((n) => n + 1);
										}}
									>
										{m.error.retry}
									</button>
								</div>
							) : (
								<div className="asset-loading" aria-busy="true">
									<p className="asset-note">{t.loading}</p>
									{[0, 1, 2].map((n) => (
										<div key={n} className="asset-skeleton" aria-hidden="true">
											<span />
											<span />
										</div>
									))}
								</div>
							)}
						</div>
					) : null}
					{files && files.length === 0 ? (
						<p className="asset-note">{t.empty}</p>
					) : null}

					{files && files.length > 0 ? (
						<p className="asset-count" aria-hidden="true">
							{count}
						</p>
					) : null}
					<Announce>{said}</Announce>

					{shown.length ? (
						<ul className="asset-list" ref={listRef}>
							{shown.map(({ file, song, level, kind: fileKind }) => {
								const name = file.key.split("/").pop() ?? file.key;
								const label = song
									? `${song.song}${level ? ` ${level.label}` : ""} · ${name}`
									: name;
								const preview = assetCanPreview(file.key);
								const music = fileKind === "music";
								const watch = preview === "video";
								const action = music ? t.listen : watch ? t.watch : t.view;
								const expanded = open === file.key;
								const src = base
									? publicAssetUrl(base, file.key, refreshed(file.v))
									: undefined;
								const thumbKey = assetThumbKey(file.key);
								const thumb = base
									? publicAssetUrl(
											base,
											thumbKey,
											refreshed(versionOf.get(thumbKey)),
										)
									: undefined;
								const previewId = `${ids}-p-${file.key}`;
								return (
									<li key={file.key} className="asset-row">
										<Thumb
											src={preview === "image" || music ? thumb : undefined}
											ext={assetExt(file.key) || t.file}
										/>
										<div className="asset-copy">
											<div className="asset-name">
												{song?.song ?? name}
												{level ? (
													<span
														className={`chart-level chart-level-${level.base ?? "other"} asset-level`}
													>
														<span>{level.base ?? level.label}</span>
														{level.tag ? <span>{level.tag}</span> : null}
													</span>
												) : null}
											</div>
											<div className="asset-path">
												<KeyPath value={file.key} /> ·{" "}
												<span className="asset-size">
													{formatSize(file.size)}
												</span>
											</div>
											{song?.illustrator && ART_KINDS.has(fileKind) ? (
												<div className="asset-credit">
													{t.illustrator.replaceAll("{name}", song.illustrator)}
												</div>
											) : null}
										</div>
										<div className="asset-actions">
											{preview ? (
												<button
													className="btn btn-ghost btn-sm asset-view"
													type="button"
													aria-expanded={expanded}
													aria-controls={expanded ? previewId : undefined}
													aria-label={`${action} · ${label}`}
													onClick={() =>
														setOpen(expanded ? undefined : file.key)
													}
												>
													{action}
													<CaretDown size={14} weight="bold" aria-hidden />
												</button>
											) : null}
											{(music || watch) && src ? (
												<a
													className="btn btn-ghost btn-sm"
													href={src}
													download={name}
													aria-label={`${t.download} · ${label}`}
												>
													{t.download}
													<DownloadSimple size={14} aria-hidden />
												</a>
											) : src ? (
												<a
													className="btn btn-ghost btn-sm"
													href={src}
													target="_blank"
													rel="noopener noreferrer"
													aria-label={`${t.download} · ${label} ${t.newTab}`}
												>
													{t.download}
													<ArrowSquareOut size={14} aria-hidden />
												</a>
											) : null}
										</div>
										{expanded && src ? (
											<div className="asset-preview" id={previewId}>
												<Preview src={src} label={label} file={file} t={t} />
											</div>
										) : null}
									</li>
								);
							})}
						</ul>
					) : null}
					{more > 0 ? (
						<button
							type="button"
							className="btn btn-ghost asset-more"
							onClick={() => {
								focusRow.current = shown.length;
								setLimit((n) => n + PAGE);
							}}
						>
							{t.showMore.replaceAll("{n}", String(more))}
						</button>
					) : null}
				</div>
			</section>
		</>
	);
}
