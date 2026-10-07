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
	type ChartLevel,
	type ChartSummary,
} from "@/lib/chart-catalog";

type Download =
	| { status: "busy"; loaded: number; total: number }
	| { status: "done"; file: string }
	| { status: "failed"; missing: boolean };

/** `filename*=UTF-8''…` first, then the plain `filename="…"` */
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
	// Safari reads the blob after click() returns
	window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function PhiraPack() {
	const { m } = useI18n();
	const t = m.phira;
	const catalog = useChartCatalog();
	const ids = useId();
	const labelId = `${ids}-label`;
	const searchBox = useRef<HTMLDivElement>(null);
	const levelsRef = useRef<HTMLUListElement>(null);
	const focusLevel = useRef<ChartLevel | "search" | undefined>(undefined);
	const aborts = useRef(new Map<ChartLevel, AbortController>());
	const [song, setSong] = useState<ChartSummary | undefined>();
	const [downloads, setDownloads] = useState<
		Partial<Record<ChartLevel, Download>>
	>({});
	const [said, setSaid] = useState("");

	// Picking a level in the search moves focus to that level's download
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

	function pick(next: ChartSummary, rank: ChartLevel) {
		if (next.id !== song?.id) stopAll();
		setSong(next);
		focusLevel.current = rank;
	}

	function change() {
		stopAll();
		setSong(undefined);
		focusLevel.current = "search";
	}

	function setDownload(rank: ChartLevel, next: Download | undefined) {
		setDownloads((prev) => ({ ...prev, [rank]: next }));
	}

	async function download(picked: ChartSummary, rank: ChartLevel) {
		if (aborts.current.has(rank)) return;
		const ac = new AbortController();
		aborts.current.set(rank, ac);
		const label = `${picked.song} ${rank}`;
		setDownload(rank, { status: "busy", loaded: 0, total: 0 });
		setSaid(`${t.downloading} ${label}`);
		try {
			const res = await fetch(
				`/api/phira?id=${encodeURIComponent(picked.id)}&level=${rank}`,
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
					// Re-render on each whole percent, not every network chunk
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

	const levels = song
		? CHART_LEVELS.flatMap((rank) => {
				const cell = song.charts[rank];
				return cell ? [{ rank, cell }] : [];
			})
		: [];

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
							</div>
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								onClick={change}
							>
								{t.change}
							</button>
						</div>
						<h3 className="sr-only">{t.levels}</h3>
						<ul className="phira-levels" ref={levelsRef}>
							{levels.map(({ rank, cell }) => {
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
								// A 404 won't change on a second press
								const missing = state?.status === "failed" && state.missing;
								return (
									<li key={rank} className="phira-level">
										<span className={`chart-level chart-level-${rank}`}>
											<span>{rank}</span>
											<span>{cell[0].toFixed(1)}</span>
										</span>
										<span className="phira-level-notes">
											{cell[1] != null
												? t.notes.replaceAll("{n}", String(cell[1]))
												: null}
										</span>
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
												if (!busy && !missing) void download(song, rank);
											}}
										>
											{busy
												? pct != null
													? t.downloadingPct.replaceAll("{pct}", String(pct))
													: t.downloading
												: t.download}
											{/* Four levels, four distinct names in a screen reader's button list */}
											<span className="sr-only">
												{` · ${song.song} ${rank} ${cell[0].toFixed(1)}`}
											</span>
										</SteadyButton>
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
																onClick={() => void download(song, rank)}
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
