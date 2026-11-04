"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import type { ChartStatus } from "@/lib/chart-status";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import type {
	BrowseChart,
	BrowseMine,
	BrowseView,
} from "@/server/chart-browse";

type SortKey = "c" | "title" | "notes" | "nps" | "bpm" | "length" | "acc";

type StatusFilter = "all" | "none" | "notFc" | "notAp" | "played";

const STEP = 50;
const STATUS_FILTERS: StatusFilter[] = [
	"all",
	"none",
	"notFc",
	"notAp",
	"played",
];

type Row = {
	key: string;
	chart: BrowseChart;
	song: BrowseView["songs"][number];
	nps: number | null;
	mine?: [ChartStatus, number];
	hay: string;
};

function fold(s: string) {
	return s.normalize("NFKC").toLowerCase();
}

function clock(sec: number | null) {
	if (sec == null) return "—";
	return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
}

function keepStatus(filter: StatusFilter, mine: Row["mine"]) {
	const status = mine?.[0] ?? "none";
	switch (filter) {
		case "all":
			return true;
		case "none":
			return status === "none";
		case "played":
			return status !== "none";
		case "notFc":
			return status !== "ap" && status !== "fc";
		case "notAp":
			return status !== "ap";
	}
}

export function ChartBrowser({
	view,
	mine,
}: {
	view: BrowseView;
	mine: BrowseMine | null;
}) {
	const { m } = useI18n();
	const t = m.charts;
	const ids = useId();
	const [q, setQ] = useState("");
	const [levels, setLevels] = useState<Set<LevelKind>>(
		() => new Set(["IN", "AT"]),
	);
	const [cMin, setCMin] = useState("");
	const [cMax, setCMax] = useState("");
	const [tag, setTag] = useState("");
	const [chapter, setChapter] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({
		key: "c",
		desc: true,
	});
	const [shown, setShown] = useState(STEP);
	const query = useDeferredValue(q);

	const tagName = useMemo(
		() => new Map(view.tags.map((x) => [x.id, x.name] as const)),
		[view.tags],
	);
	const tagGroups = useMemo(() => {
		const out = new Map<string, BrowseView["tags"]>();
		for (const x of view.tags) {
			const list = out.get(x.cat) ?? [];
			list.push(x);
			out.set(x.cat, list);
		}
		return [...out];
	}, [view.tags]);

	const rows = useMemo<Row[]>(
		() =>
			view.charts.flatMap((chart) => {
				const song = view.songs[chart[0]];
				if (!song) return [];
				const key = `${song.id}:${chart[1]}`;
				return [
					{
						key,
						chart,
						song,
						nps: song.length && chart[3] ? chart[3] / song.length : null,
						mine: mine?.[key],
						hay: fold(`${song.title}\n${song.composer}\n${chart[8]}`),
					},
				];
			}),
		[view, mine],
	);

	const list = useMemo(() => {
		const needle = fold(query.trim());
		const lo = cMin ? Number(cMin) : Number.NEGATIVE_INFINITY;
		const hi = cMax ? Number(cMax) : Number.POSITIVE_INFINITY;
		const tagId = tag ? Number(tag) : null;
		const kept = rows.filter(
			(r) =>
				levels.has(r.chart[1]) &&
				r.chart[2] >= lo - 1e-9 &&
				r.chart[2] <= hi + 1e-9 &&
				(tagId == null || r.chart[9].includes(tagId)) &&
				(!chapter || r.song.chapter === chapter) &&
				(!mine || keepStatus(status, r.mine)) &&
				(!needle || r.hay.includes(needle)),
		);
		const value = (r: Row): number | string | null => {
			switch (sort.key) {
				case "c":
					return r.chart[2];
				case "title":
					return r.song.title.toLowerCase();
				case "notes":
					return r.chart[3] || null;
				case "nps":
					return r.nps;
				case "bpm":
					return r.song.bpm;
				case "length":
					return r.song.length;
				case "acc":
					return r.mine?.[1] ?? null;
			}
		};
		const dir = sort.desc ? -1 : 1;
		return kept.sort((a, b) => {
			const x = value(a);
			const y = value(b);
			if (x == null && y == null) return 0;
			if (x == null) return 1;
			if (y == null) return -1;
			if (x < y) return -dir;
			if (x > y) return dir;
			return b.chart[2] - a.chart[2] || a.key.localeCompare(b.key);
		});
	}, [rows, query, levels, cMin, cMax, tag, chapter, status, mine, sort]);

	const reset = () => setShown(STEP);
	const toggleLevel = (rank: LevelKind) => {
		setLevels((prev) => {
			const next = new Set(prev);
			if (next.has(rank)) next.delete(rank);
			else next.add(rank);
			return next;
		});
		reset();
	};
	const sortBy = (key: SortKey) => {
		setSort((prev) =>
			prev.key === key
				? { key, desc: !prev.desc }
				: { key, desc: key !== "title" },
		);
		reset();
	};
	const head = (key: SortKey, label: string, num = true) => (
		<th
			scope="col"
			className={num ? "num" : undefined}
			aria-sort={
				sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined
			}
		>
			<button type="button" className="cb-sort" onClick={() => sortBy(key)}>
				{label}
				<span aria-hidden="true" className="cb-arrow">
					{sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
				</span>
			</button>
		</th>
	);

	return (
		<>
			<div className="cb-filters">
				<div className="field field-col cb-q">
					<label className="field-label" htmlFor={`${ids}-q`}>
						{t.search}
					</label>
					<input
						id={`${ids}-q`}
						className="input"
						type="search"
						value={q}
						placeholder={t.searchHint}
						onChange={(e) => {
							setQ(e.target.value);
							reset();
						}}
					/>
				</div>
				<fieldset className="opt">
					<legend className="opt-label">{t.levels}</legend>
					<div className="tgt-levels">
						{LEVEL.map((rank) => (
							<label key={rank} className="opt-check">
								<input
									type="checkbox"
									checked={levels.has(rank)}
									onChange={() => toggleLevel(rank)}
								/>
								<span className={`chart-level chart-level-${rank}`}>
									{rank}
								</span>
							</label>
						))}
					</div>
				</fieldset>
				<fieldset className="opt">
					<legend className="opt-label">{t.constant}</legend>
					<div className="cb-range">
						<input
							className="input"
							type="number"
							inputMode="decimal"
							step="0.1"
							min="0"
							max="18"
							value={cMin}
							aria-label={t.from}
							placeholder={t.from}
							onChange={(e) => {
								setCMin(e.target.value);
								reset();
							}}
						/>
						<span aria-hidden="true">–</span>
						<input
							className="input"
							type="number"
							inputMode="decimal"
							step="0.1"
							min="0"
							max="18"
							value={cMax}
							aria-label={t.to}
							placeholder={t.to}
							onChange={(e) => {
								setCMax(e.target.value);
								reset();
							}}
						/>
					</div>
				</fieldset>
				<div className="field field-col">
					<label className="field-label" htmlFor={`${ids}-tag`}>
						{t.tag}
					</label>
					<select
						id={`${ids}-tag`}
						className="input"
						value={tag}
						onChange={(e) => {
							setTag(e.target.value);
							reset();
						}}
					>
						<option value="">{t.anyTag}</option>
						{tagGroups.map(([cat, list]) => (
							<optgroup key={cat} label={cat || t.otherTags}>
								{list.map((x) => (
									<option key={x.id} value={x.id}>
										{x.name}
									</option>
								))}
							</optgroup>
						))}
					</select>
				</div>
				<div className="field field-col">
					<label className="field-label" htmlFor={`${ids}-ch`}>
						{t.chapter}
					</label>
					<select
						id={`${ids}-ch`}
						className="input"
						value={chapter}
						onChange={(e) => {
							setChapter(e.target.value);
							reset();
						}}
					>
						<option value="">{t.anyChapter}</option>
						{view.chapters.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
				</div>
				{mine ? (
					<div className="field field-col">
						<label className="field-label" htmlFor={`${ids}-st`}>
							{t.status}
						</label>
						<select
							id={`${ids}-st`}
							className="input"
							value={status}
							onChange={(e) => {
								setStatus(e.target.value as StatusFilter);
								reset();
							}}
						>
							{STATUS_FILTERS.map((s) => (
								<option key={s} value={s}>
									{t.statuses[s]}
								</option>
							))}
						</select>
					</div>
				) : null}
			</div>
			{!mine ? <p className="field-hint">{t.signInHint}</p> : null}
			<p className="field-hint" role="status">
				{fill(t.count, {
					shown: String(Math.min(shown, list.length)),
					total: String(list.length),
				})}
			</p>
			{list.length ? (
				<>
					<div className="data-scroll">
						<table className="data-table cb-table">
							<thead>
								<tr>
									{head("title", t.song, false)}
									<th scope="col">{t.level}</th>
									{head("c", t.constant)}
									{head("notes", t.notes)}
									{head("nps", t.nps)}
									{head("bpm", t.bpm)}
									{head("length", t.length)}
									<th scope="col">{t.tags}</th>
									{mine ? head("acc", t.yours) : null}
								</tr>
							</thead>
							<tbody>
								{list.slice(0, shown).map((r) => (
									<tr key={r.key}>
										<th scope="row" className="data-song">
											<Link href={songPath(r.song.id)} prefetch={false}>
												{r.song.title}
											</Link>
											{r.song.composer ? (
												<span className="cb-sub">{r.song.composer}</span>
											) : null}
										</th>
										<td>
											<span className={`chart-level chart-level-${r.chart[1]}`}>
												{r.chart[1]}
											</span>
										</td>
										<td className="num">{r.chart[2].toFixed(1)}</td>
										<td className="num">{r.chart[3] || "—"}</td>
										<td className="num">{r.nps ? r.nps.toFixed(2) : "—"}</td>
										<td className="num">{r.song.bpm ?? "—"}</td>
										<td className="num">{clock(r.song.length)}</td>
										<td className="cb-tags">
											{r.chart[9].length ? (
												r.chart[9]
													.slice(0, 3)
													.map((id) => tagName.get(id) ?? id)
													.join(" · ")
											) : (
												<span className="muted">—</span>
											)}
										</td>
										{mine ? (
											<td className="num">
												{r.mine ? (
													<>
														{r.mine[1].toFixed(2)}%
														{r.mine[0] === "ap" || r.mine[0] === "fc" ? (
															<span
																className="pg-badge"
																data-status={r.mine[0]}
															>
																{r.mine[0].toUpperCase()}
															</span>
														) : null}
													</>
												) : (
													<span className="muted">—</span>
												)}
											</td>
										) : null}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					{list.length > shown ? (
						<button
							type="button"
							className="btn btn-ghost data-more"
							onClick={() => setShown((n) => n + STEP)}
						>
							{fill(t.more, {
								n: String(Math.min(STEP, list.length - shown)),
							})}
						</button>
					) : null}
				</>
			) : (
				<p className="callout">{t.none}</p>
			)}
		</>
	);
}
