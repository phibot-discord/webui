"use client";

import {
	ArrowSquareOut,
	CaretDown,
	DownloadSimple,
	WarningCircle,
} from "@phosphor-icons/react";
import {
	Fragment,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useChartCatalog } from "@/components/ChartSearch";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import {
	ASSET_KINDS,
	type AssetFile,
	type AssetFilter,
	assetCanPreview,
	assetExt,
	assetKind,
	assetThumbKey,
	publicAssetUrl,
} from "@/lib/assets";
import type { ChartSummary } from "@/lib/chart-catalog";
import { rankSongs } from "@/lib/song-search";

const PAGE = 48;
const TEXT_PREVIEW_MAX = 200_000;

function fold(value: string) {
	return value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

function formatSize(size: number) {
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function songStem(key: string) {
	const file = key.split("/").pop() ?? key;
	return file.replace(/\.[^.]+$/, "").replace(/-(EZ|HD|IN|AT)$/, "");
}

function songOf(key: string, songs: Map<string, ChartSummary>) {
	const stem = songStem(key);
	return songs.get(stem) ?? songs.get(`${stem}.0`);
}

function Preview({
	src,
	label,
	file,
}: {
	src: string;
	label: string;
	file: AssetFile;
}) {
	const { m } = useI18n();
	const [broken, setBroken] = useState(false);
	const kind = assetCanPreview(file.key);
	if (broken)
		return (
			<p className="asset-error" role="alert">
				<WarningCircle size={16} weight="fill" aria-hidden />
				{m.files.previewFailed}
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
	if (kind === "text" && file.size > TEXT_PREVIEW_MAX)
		return <p className="asset-note">{m.files.tooBig}</p>;
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

export function AssetBrowser() {
	const { m } = useI18n();
	const t = m.files;
	const catalog = useChartCatalog();
	const ids = useId();
	const searchId = `${ids}-search`;
	const [base, setBase] = useState<string | undefined>();
	const [files, setFiles] = useState<AssetFile[] | undefined>();
	const [failed, setFailed] = useState(false);
	const [attempt, setAttempt] = useState(0);
	const [query, setQuery] = useState("");
	const [kind, setKind] = useState<AssetFilter>("all");
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

	const songs = useMemo(() => {
		const map = new Map<string, ChartSummary>();
		if (catalog.status !== "ready") return map;
		for (const song of catalog.list) {
			map.set(song.id, song);
			map.set(song.id.replace(/\.0$/, ""), song);
		}
		return map;
	}, [catalog]);

	const present = useMemo(
		() => new Set((files ?? []).map((file) => assetKind(file.key))),
		[files],
	);

	const trimmed = query.trim();
	const q = fold(trimmed);
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
	const matched = useMemo(
		() =>
			(files ?? []).filter((file) => {
				if (!q) return true;
				if (fold(file.key).includes(q)) return true;
				const song = songOf(file.key, songs);
				return song ? (named?.has(song.id) ?? false) : false;
			}),
		[files, q, songs, named],
	);
	const counts = useMemo(() => {
		const out: Partial<Record<AssetFilter, number>> = { all: matched.length };
		for (const file of matched) {
			const k = assetKind(file.key);
			out[k] = (out[k] ?? 0) + 1;
		}
		return out;
	}, [matched]);
	const hits = useMemo(
		() =>
			kind === "all"
				? matched
				: matched.filter((file) => assetKind(file.key) === kind),
		[matched, kind],
	);
	const shown = hits.slice(0, limit);
	const more = Math.min(PAGE, hits.length - shown.length);

	const resetPage = useCallback(() => {
		setLimit(PAGE);
		setOpen(undefined);
	}, []);

	const count = files
		? hits.length
			? t.matches
					.replaceAll("{shown}", String(shown.length))
					.replaceAll("{total}", String(hits.length))
			: t.none
		: "";
	const [said, setSaid] = useState("");
	useEffect(() => {
		const id = window.setTimeout(() => setSaid(count), 700);
		return () => window.clearTimeout(id);
	}, [count]);

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
						{shown.map((file) => {
							const song = songOf(file.key, songs);
							const name = file.key.split("/").pop() ?? file.key;
							const label = song ? `${song.song} · ${name}` : name;
							const preview = assetCanPreview(file.key);
							const music = assetKind(file.key) === "music";
							const expanded = open === file.key;
							const src = base ? publicAssetUrl(base, file.key) : undefined;
							const thumb = base
								? publicAssetUrl(base, assetThumbKey(file.key))
								: undefined;
							const previewId = `${ids}-p-${file.key}`;
							return (
								<li key={file.key} className="asset-row">
									<Thumb
										src={preview === "image" || music ? thumb : undefined}
										ext={assetExt(file.key) || t.file}
									/>
									<div className="asset-copy">
										<div className="asset-name">{song?.song ?? name}</div>
										<div className="asset-path">
											<KeyPath value={file.key} /> ·{" "}
											<span className="asset-size">
												{formatSize(file.size)}
											</span>
										</div>
									</div>
									<div className="asset-actions">
										{preview ? (
											<button
												className="btn btn-ghost btn-sm asset-view"
												type="button"
												aria-expanded={expanded}
												aria-controls={expanded ? previewId : undefined}
												aria-label={`${music ? t.listen : t.view} · ${label}`}
												onClick={() => setOpen(expanded ? undefined : file.key)}
											>
												{music ? t.listen : t.view}
												<CaretDown size={14} weight="bold" aria-hidden />
											</button>
										) : null}
										{music && src ? (
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
											<Preview src={src} label={label} file={file} />
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
			</section>
		</>
	);
}
