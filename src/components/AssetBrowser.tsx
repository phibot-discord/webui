"use client";

import { useEffect, useMemo, useState } from "react";
import { useChartCatalog } from "@/components/ChartSearch";
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

const SHOW = 48;
const TEXT_PREVIEW_MAX = 200_000;

function fold(value: string) {
	return value.toLowerCase().replace(/\s+/g, "");
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
	const kind = assetCanPreview(file.key);
	if (kind === "image")
		return (
			// biome-ignore lint/performance/noImgElement: arbitrary R2 object, not a known static asset
			<img className="asset-preview-img" src={src} alt={label} />
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

export function AssetBrowser() {
	const { m } = useI18n();
	const t = m.files;
	const catalog = useChartCatalog();
	const [base, setBase] = useState<string | undefined>();
	const [files, setFiles] = useState<AssetFile[] | undefined>();
	const [failed, setFailed] = useState(false);
	const [query, setQuery] = useState("");
	const [kind, setKind] = useState<AssetFilter>("all");
	const [open, setOpen] = useState<string | undefined>();

	useEffect(() => {
		const ac = new AbortController();
		fetch("/api/assets", { signal: ac.signal })
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
	}, []);

	const songs = useMemo(() => {
		const map = new Map<string, ChartSummary>();
		if (catalog.status !== "ready") return map;
		for (const song of catalog.list) {
			map.set(song.id, song);
			map.set(song.id.replace(/\.0$/, ""), song);
		}
		return map;
	}, [catalog]);

	const q = fold(query.trim());
	const browsing = q.length > 0 || kind !== "all";
	const hits =
		files && browsing
			? files.filter((file) => {
					if (kind !== "all" && assetKind(file.key) !== kind) return false;
					if (!q) return true;
					const song = songOf(file.key, songs);
					const hay = fold(
						`${file.key} ${song?.song ?? ""} ${song?.composer ?? ""} ${song?.id ?? ""}`,
					);
					return hay.includes(q);
				})
			: [];
	const shown = hits.slice(0, SHOW);

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<section className="callout">
				<input
					className="asset-search"
					type="search"
					value={query}
					placeholder={t.searchPlaceholder}
					aria-label={t.searchPlaceholder}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<fieldset className="asset-kinds">
					<legend>{t.kindLabel}</legend>
					{ASSET_KINDS.map((id) => (
						<button
							key={id}
							type="button"
							aria-pressed={kind === id}
							onClick={() => setKind(id)}
						>
							{t.kinds[id]}
						</button>
					))}
				</fieldset>
				{failed ? <p className="asset-error">{t.failed}</p> : null}
				{!failed && !files ? <p className="asset-note">{t.loading}</p> : null}
				{files && !browsing ? <p className="asset-note">{t.empty}</p> : null}
				{files && browsing && hits.length === 0 ? (
					<p className="asset-note">{t.none}</p>
				) : null}
				{shown.length > 0 ? (
					<p className="asset-note">
						{shown.length} / {hits.length} {t.matches}
					</p>
				) : null}
				<ul className="asset-list">
					{shown.map((file) => {
						const song = songOf(file.key, songs);
						const name = file.key.split("/").pop() ?? file.key;
						const label = song ? `${song.song} · ${name}` : name;
						const preview = assetCanPreview(file.key);
						const expanded = open === file.key;
						const src = base ? publicAssetUrl(base, file.key) : undefined;
						const thumb = base
							? publicAssetUrl(base, assetThumbKey(file.key))
							: undefined;
						return (
							<li key={file.key} className="asset-row">
								{preview === "image" && thumb ? (
									// biome-ignore lint/performance/noImgElement: arbitrary R2 object, not a known static asset
									<img className="asset-thumb" alt="" src={thumb} />
								) : (
									<span className="asset-ext">
										{assetExt(file.key) || "file"}
									</span>
								)}
								<div className="asset-copy">
									<div className="asset-name">{song?.song ?? name}</div>
									<div className="asset-path">
										{file.key} · {formatSize(file.size)}
									</div>
								</div>
								<div className="asset-actions">
									{preview ? (
										<button
											className="btn btn-ghost"
											type="button"
											aria-expanded={expanded}
											onClick={() => setOpen(expanded ? undefined : file.key)}
										>
											{expanded ? t.close : t.view}
										</button>
									) : null}
									{src ? (
										<a
											className="btn btn-ghost"
											href={src}
											target="_blank"
											rel="noopener noreferrer"
										>
											{t.download}
										</a>
									) : null}
								</div>
								{expanded && src ? (
									<div className="asset-preview">
										<Preview src={src} label={label} file={file} />
									</div>
								) : null}
							</li>
						);
					})}
				</ul>
			</section>
		</>
	);
}
