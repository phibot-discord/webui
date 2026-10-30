"use client";

import { useMemo, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL, type LevelKind } from "@/phi/lib/const";
import { sortTargets, type Target, type TargetSort } from "@/phi/lib/targets";
import type { TargetRow, TargetsView } from "@/server/save-views";

const STEP = 50;
const SORTS: TargetSort[] = ["gap", "need", "constant", "ap"];

const pct = (n: number) => `${n.toFixed(2)}%`;

function asTarget(r: TargetRow): Target {
	return {
		id: r.id,
		rank: r.rank,
		difficulty: r.c,
		acc: r.acc,
		need: r.need,
		viaAp: r.ap,
		apGain: r.gain,
	};
}

export function TargetsList({ view }: { view: TargetsView }) {
	const { m } = useI18n();
	const t = m.targets;
	const [levels, setLevels] = useState<Set<LevelKind>>(
		() => new Set(["IN", "AT"]),
	);
	const [unplayed, setUnplayed] = useState(false);
	const [sort, setSort] = useState<TargetSort>("gap");
	const [shown, setShown] = useState(STEP);

	const all = useMemo(() => view.rows.map(asTarget), [view.rows]);
	const list = useMemo(
		() =>
			sortTargets(
				all.filter((r) => levels.has(r.rank) && (unplayed || r.acc != null)),
				sort,
			),
		[all, levels, unplayed, sort],
	);
	const shownStep = (Math.round(view.goal * 100) / 100).toFixed(2);

	if (!view.rows.length && !view.stuck) {
		return (
			<>
				<h2 className="desk-section-title">{t.title}</h2>
				<p className="lede">{t.empty}</p>
			</>
		);
	}

	const toggleLevel = (rank: LevelKind) => {
		setLevels((prev) => {
			const next = new Set(prev);
			if (next.has(rank)) next.delete(rank);
			else next.add(rank);
			return next;
		});
		setShown(STEP);
	};

	const rest = list.length - shown;

	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			<p className="manual-summary tgt-summary">
				<span>
					<span className="meta-label">{t.now} </span>
					<span className="meta-value">{view.rks.toFixed(4)}</span>
				</span>
				<span aria-hidden="true">→</span>
				<span>
					<span className="meta-label">{t.next} </span>
					<span className="meta-value">{shownStep}</span>
				</span>
			</p>
			<p className="field-hint tgt-note">
				{fill(t.goalNote, { goal: view.goal.toFixed(4), shown: shownStep })}
			</p>

			<div className="tgt-filters">
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
				<SegRadio
					legend={t.sortLabel}
					value={sort}
					options={SORTS.map((value) => ({ value, label: t.sort[value] }))}
					onChange={(next) => {
						setSort(next);
						setShown(STEP);
					}}
				/>
				<label className="opt-check">
					<input
						type="checkbox"
						checked={unplayed}
						onChange={(e) => {
							setUnplayed(e.target.checked);
							setShown(STEP);
						}}
					/>
					{t.unplayed}
				</label>
			</div>

			<p className="field-hint" role="status">
				{fill(t.count, {
					shown: String(Math.min(shown, list.length)),
					total: String(list.length),
				})}
			</p>

			{list.length ? (
				<div className="data-scroll">
					<table className="data-table tgt-table">
						<thead>
							<tr>
								<th scope="col">{t.song}</th>
								<th scope="col">{t.level}</th>
								<th scope="col" className="num">
									{t.constant}
								</th>
								<th scope="col" className="num">
									{t.acc}
								</th>
								<th scope="col" className="num">
									{t.target}
								</th>
								<th scope="col" className="num">
									{t.gap}
								</th>
								<th scope="col" className="num">
									{t.apGain}
								</th>
							</tr>
						</thead>
						<tbody>
							{list.slice(0, shown).map((r) => {
								const song = view.songs[r.id] ?? r.id;
								return (
									<tr key={`${r.id}:${r.rank}`}>
										<th scope="row" className="data-song">
											<Link href={songPath(r.id)} prefetch={false}>
												{song}
											</Link>
										</th>
										<td>
											<span className={`chart-level chart-level-${r.rank}`}>
												{r.rank}
											</span>
										</td>
										<td className="num">{r.difficulty.toFixed(1)}</td>
										<td className="num">
											{r.acc == null ? (
												<span className="muted">{t.notPlayed}</span>
											) : (
												pct(r.acc)
											)}
										</td>
										<td className="num tgt-need">
											{r.viaAp ? t.apOnly : r.need != null ? pct(r.need) : "—"}
										</td>
										<td className="num">
											{r.need != null && r.acc != null
												? `+${(r.need - r.acc).toFixed(2)}`
												: "—"}
										</td>
										<td className="num">+{r.apGain.toFixed(4)}</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			) : (
				<p className="callout">{t.none}</p>
			)}

			{rest > 0 ? (
				<button
					type="button"
					className="btn btn-ghost data-more"
					onClick={() => setShown((n) => n + STEP)}
				>
					{fill(t.more, { n: String(Math.min(STEP, rest)) })}
				</button>
			) : null}

			{view.stuck ? (
				<p className="field-hint tgt-stuck">
					{fill(t.stuck, { n: String(view.stuck) })}
				</p>
			) : null}
		</>
	);
}
