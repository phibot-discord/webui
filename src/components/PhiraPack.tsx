"use client";

import {
	ArrowCounterClockwise,
	CheckCircle,
	FileArchive,
	WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { ChartSearch, useChartCatalog } from "@/components/ChartSearch";
import { chartSearchText } from "@/components/ScoreControl";
import { Announce, SteadyButton } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import {
	CHART_LEVELS,
	type ChartCell,
	type ChartSummary,
	cellLabel,
	isExtraPackLevel,
	type PackLevel,
	packLevelName,
} from "@/lib/chart-catalog";
import type { Era } from "@/server/history";

type Download =
	| { status: "busy"; loaded: number; total: number }
	| { status: "done"; file: string }
	| { status: "failed"; missing: boolean };

function fileNameOf(res: Response, fallback: string) {
	const cd = res.headers.get("content-disposition") ?? "";
	const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
	if (star?.[1]) {
		try {
			return decodeURIComponent(star[1]);
		} catch {}
	}
	return /filename="([^"]+)"/i.exec(cd)?.[1] ?? fallback;
}

function saveBlob(blob: Blob, file: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = file;
	document.body.append(a);
	a.click();
	a.remove();
	window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

type History = { current: string[]; eras: Era[] };
type Row = {
	rank: PackLevel;
	cell: ChartCell | undefined;
	ver?: string;
	same?: boolean;
};

function levelOrder(level: string): number {
	const at = CHART_LEVELS.indexOf(level as (typeof CHART_LEVELS)[number]);
	return at < 0 ? CHART_LEVELS.length : at;
}

function shownVersion(version: string): string {
	return version.replace(/-(\d+)$/, " ($1)");
}

function versionSpan(versions: string[]): string {
	const first = shownVersion(versions[0] ?? "");
	const last = shownVersion(versions.at(-1) ?? "") || first;
	return first === last ? first : `${first} – ${last}`;
}

function eraLabel(era: Era): string {
	const changed = Object.entries(era.charts)
		.filter(([, chart]) => chart.rev)
		.sort(([a], [b]) => levelOrder(a) - levelOrder(b))
		.map(([rank]) => packLevelName(rank)?.base ?? rank);
	const span = versionSpan(era.versions);
	return changed.length ? `${span} · ${changed.join(" / ")}` : span;
}

function goneFrom(song: ChartSummary): string {
	const from = new Set(Object.values(song.removed ?? {}).map((r) => r.from));
	return [...from].join(" / ");
}

export function PhiraPack() {
	const { m } = useI18n();
	const t = m.phira;
	const catalog = useChartCatalog(true);
	const ids = useId();
	const labelId = `${ids}-label`;
	const versionId = `${ids}-version`;
	const searchBox = useRef<HTMLDivElement>(null);
	const levelsRef = useRef<HTMLUListElement>(null);
	const focusLevel = useRef<PackLevel | "search" | undefined>(undefined);
	const aborts = useRef(new Map<PackLevel, AbortController>());
	const [song, setSong] = useState<ChartSummary | undefined>();
	const [extras, setExtras] = useState<
		{ id: string; levels: PackLevel[]; history?: History } | undefined
	>();
	const [eraAt, setEraAt] = useState(-1);
	const [downloads, setDownloads] = useState<
		Partial<Record<PackLevel, Download>>
	>({});
	const [said, setSaid] = useState("");
	const songId = song?.id;

	useEffect(() => {
		if (!songId) return;
		const ac = new AbortController();
		fetch(`/api/phira/extras?id=${encodeURIComponent(songId)}`, {
			signal: ac.signal,
		})
			.then(async (res) => {
				if (!res.ok) {
					setExtras({ id: songId, levels: [] });
					return;
				}
				const body = (await res.json()) as {
					levels?: unknown;
					history?: History;
				};
				const levels = Array.isArray(body.levels)
					? body.levels.filter(
							(v): v is PackLevel =>
								typeof v === "string" && isExtraPackLevel(v),
						)
					: [];
				const history = Array.isArray(body.history?.eras)
					? body.history
					: undefined;
				setExtras({ id: songId, levels, history });
			})
			.catch(() => {
				if (!ac.signal.aborted) setExtras({ id: songId, levels: [] });
			});
		return () => ac.abort();
	}, [songId]);

	useEffect(() => {
		const next = focusLevel.current;
		if (!next) return;
		focusLevel.current = undefined;
		if (next === "search") {
			searchBox.current?.querySelector<HTMLInputElement>("input")?.focus();
		} else {
			levelsRef.current
				?.querySelector<HTMLElement>(`[data-level="${next}"]`)
				?.focus();
		}
	});

	useEffect(() => {
		const running = aborts.current;
		return () => {
			for (const ac of running.values()) ac.abort();
		};
	}, []);

	function stopAll() {
		for (const ac of aborts.current.values()) ac.abort();
		aborts.current.clear();
		setDownloads({});
	}

	function pick(next: ChartSummary, rank: PackLevel) {
		if (next.id !== song?.id) {
			stopAll();
			setEraAt(-1);
		}
		setSong(next);
		focusLevel.current = rank;
	}

	function change() {
		stopAll();
		setEraAt(-1);
		setSong(undefined);
		focusLevel.current = "search";
	}

	function setDownload(rank: PackLevel, next: Download | undefined) {
		setDownloads((prev) => ({ ...prev, [rank]: next }));
	}

	async function download(picked: ChartSummary, rank: PackLevel, ver?: string) {
		if (aborts.current.has(rank)) return;
		const ac = new AbortController();
		aborts.current.set(rank, ac);
		const label = `${picked.song} ${packLevelName(rank)?.label ?? rank}`;
		setDownload(rank, { status: "busy", loaded: 0, total: 0 });
		setSaid(`${t.downloading} ${label}`);
		try {
			const res = await fetch(
				`/api/phira?id=${encodeURIComponent(picked.id)}&level=${rank}${ver ? `&ver=${encodeURIComponent(ver)}` : ""}`,
				{ signal: ac.signal },
			);
			if (!res.ok) {
				setDownload(rank, { status: "failed", missing: res.status === 404 });
				setSaid(res.status === 404 ? t.missing : t.failed);
				return;
			}
			const total = Number(res.headers.get("content-length")) || 0;
			const chunks: Uint8Array<ArrayBuffer>[] = [];
			let loaded = 0;
			let shown = 0;
			const reader = res.body?.getReader();
			if (reader) {
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					chunks.push(value);
					loaded += value.byteLength;
					const pct = total ? Math.floor((loaded / total) * 100) : 0;
					if (pct !== shown) {
						shown = pct;
						setDownload(rank, { status: "busy", loaded, total });
					}
				}
			} else {
				chunks.push(new Uint8Array(await res.arrayBuffer()));
			}
			const file = fileNameOf(res, `${picked.id}-${rank}.pez`);
			saveBlob(new Blob(chunks, { type: "application/octet-stream" }), file);
			setDownload(rank, { status: "done", file });
			setSaid(t.downloaded.replaceAll("{file}", file));
		} catch {
			if (ac.signal.aborted) return;
			setDownload(rank, { status: "failed", missing: false });
			setSaid(t.failed);
		} finally {
			if (aborts.current.get(rank) === ac) aborts.current.delete(rank);
		}
	}

	const history = song && extras?.id === song.id ? extras.history : undefined;
	const lookingFurther = Boolean(song) && extras?.id !== song?.id;
	const era = history?.eras[eraAt];
	const scored: Row[] = era
		? Object.entries(era.charts)
				.sort(([a], [b]) => levelOrder(a) - levelOrder(b))
				.map(([rank, chart]) => ({
					rank,
					cell: [0, chart.notes, chart.label],
					ver: chart.rev,
					same: !chart.rev,
				}))
		: song
			? CHART_LEVELS.flatMap((rank) => {
					const cell = song.charts[rank];
					return cell ? [{ rank, cell }] : [];
				})
			: [];
	const levels: Row[] = [
		...scored,
		...(song && extras?.id === song.id
			? extras.levels
					.filter((rank) => !scored.some((row) => row.rank === rank))
					.map((rank) => ({ rank, cell: undefined }))
			: []),
	];
	const pickEra = (next: number) => {
		stopAll();
		setEraAt(next);
	};

	return (
		<>
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<section className="callout phira-pack">
				<div className="field field-col phira-search" ref={searchBox}>
					<span className="field-label" id={labelId}>
						{t.searchLabel}
					</span>
					<ChartSearch
						catalog={catalog}
						placeholder={t.searchPlaceholder}
						onPick={pick}
						labelledBy={labelId}
						text={chartSearchText(m)}
					/>
				</div>

				{song ? (
					<div className="phira-song">
						<div className="phira-song-head">
							<div className="phira-song-name">
								<h2>{song.song}</h2>
								<p>{song.composer}</p>
								{song.gone ? (
									<p className="phira-gone">
										{t.goneSong.replaceAll("{v}", goneFrom(song))}
									</p>
								) : null}
							</div>
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								onClick={change}
							>
								{t.change}
							</button>
						</div>
						{history ? (
							<div className="field phira-version">
								<label htmlFor={versionId}>{t.version}</label>
								<select
									id={versionId}
									value={eraAt}
									aria-describedby={`${versionId}-note`}
									onChange={(event) =>
										pickEra(Number(event.currentTarget.value))
									}
								>
									<option value={-1}>
										{t.versionCurrent.replaceAll(
											"{v}",
											versionSpan(history.current),
										)}
									</option>
									{history.eras.map((each, i) => (
										<option key={each.versions.join()} value={i}>
											{eraLabel(each)}
										</option>
									))}
								</select>
								<p className="opt-note" id={`${versionId}-note`}>
									{t.versionNote}
								</p>
							</div>
						) : null}
						<h3 className="sr-only">{t.levels}</h3>
						<ul className="phira-levels" ref={levelsRef}>
							{levels.map(({ rank, cell, ver, same }) => {
								const name = packLevelName(rank);
								const removed = era?.charts[rank]
									? undefined
									: song.removed?.[rank];
								const level = cell
									? cellLabel(cell)
									: (removed?.label ?? name?.tag ?? "");
								const notes = cell?.[1] ?? removed?.notes;
								const state = downloads[rank];
								const busy = state?.status === "busy";
								const pct =
									busy && state.total
										? Math.min(
												100,
												Math.round((state.loaded / state.total) * 100),
											)
										: undefined;
								const statusId = `${ids}-${rank}-status`;
								const missing = state?.status === "failed" && state.missing;
								return (
									<li key={rank} className="phira-level">
										<span
											className={`chart-level chart-level-${name?.base ?? "other"}`}
										>
											<span>{name?.base ?? name?.label ?? rank}</span>
											{level ? <span>{level}</span> : null}
										</span>
										<span className="phira-level-notes">
											{notes != null
												? t.notes.replaceAll("{n}", String(notes))
												: null}
											{removed && !song.gone ? (
												<span className="phira-removed">
													{t.removedLevel.replaceAll("{v}", removed.from)}
												</span>
											) : null}
										</span>
										{same ? (
											<span className="phira-same">{t.sameAsCurrent}</span>
										) : (
											<SteadyButton
												type="button"
												className="btn-ghost phira-download"
												data-level={rank}
												labels={[
													t.download,
													t.downloading,
													t.downloadingPct.replaceAll("{pct}", "100"),
												]}
												aria-describedby={state && !busy ? statusId : undefined}
												aria-busy={busy || undefined}
												aria-disabled={busy || missing || undefined}
												onClick={() => {
													if (!busy && !missing) void download(song, rank, ver);
												}}
											>
												{busy
													? pct != null
														? t.downloadingPct.replaceAll("{pct}", String(pct))
														: t.downloading
													: t.download}
												<span className="sr-only">
													{` · ${song.song} ${name?.base ?? rank} ${level}`}
												</span>
											</SteadyButton>
										)}
										{busy ? (
											<progress
												className="phira-progress"
												max={state.total || undefined}
												value={state.total ? state.loaded : undefined}
												aria-hidden="true"
											/>
										) : null}
										{state && state.status !== "busy" ? (
											<p
												className={`phira-status phira-status-${state.status}`}
											>
												{state.status === "done" ? (
													<>
														<CheckCircle size={16} weight="fill" aria-hidden />
														<span className="phira-status-text" id={statusId}>
															{t.downloaded.replaceAll("{file}", state.file)}
														</span>
													</>
												) : (
													<>
														<WarningCircle
															size={16}
															weight="fill"
															aria-hidden
														/>
														<span className="phira-status-text" id={statusId}>
															{state.missing ? t.missing : t.failed}
														</span>
														{state.missing ? null : (
															<button
																type="button"
																className="btn btn-quiet btn-sm"
																onClick={() => void download(song, rank, ver)}
															>
																<ArrowCounterClockwise size={16} aria-hidden />
																{m.error.retry}
															</button>
														)}
													</>
												)}
											</p>
										) : null}
									</li>
								);
							})}
						</ul>
						{lookingFurther ? (
							<p className="phira-more" role="status">
								<span className="phira-spinner" aria-hidden="true" />
								{t.loadingMore}
							</p>
						) : null}
					</div>
				) : catalog.status === "failed" ? (
					<div className="phira-failed" role="alert">
						<p>
							<WarningCircle size={18} weight="fill" aria-hidden />
							{t.chartsFailed}
						</p>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={() => window.location.reload()}
						>
							<ArrowCounterClockwise size={16} aria-hidden />
							{t.reload}
						</button>
					</div>
				) : (
					<div className="phira-empty">
						<FileArchive size={28} aria-hidden />
						<p>{t.empty}</p>
					</div>
				)}
			</section>
			<Announce>{said}</Announce>
		</>
	);
}
