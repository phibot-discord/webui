"use client";

import { type CSSProperties, useId, useState } from "react";
import Link from "@/components/LocaleLink";
import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { fill } from "@/phi/lib/card-i18n";
import type { SongTagList } from "@/server/song-tags";

export function SongTags({
	lists,
	top,
	date,
}: {
	lists: Record<string, SongTagList>;
	top: string;
	date?: string;
}) {
	const { m } = useI18n();
	const t = m.songPage;
	const c = t.chartTags;
	const ids = useId();
	const levels = Object.keys(lists);
	const [level, setLevel] = useState(
		levels.includes(top) ? top : (levels.at(-1) ?? ""),
	);
	const list = lists[level];
	if (!list) return null;
	return (
		<section className="song-section" aria-labelledby={`${ids}-h`}>
			<h2 id={`${ids}-h`}>{c.title}</h2>
			<p className="field-hint">{c.hint}</p>
			{levels.length > 1 ? (
				<SegRadio
					className="song-level-pick"
					legend={t.level}
					value={level}
					options={levels.map((value) => ({ value, label: value }))}
					onChange={setLevel}
				/>
			) : null}
			<div className="data-scroll">
				<table className="data-table song-tags">
					<caption className="sr-only">{fill(c.caption, { level })}</caption>
					<thead>
						<tr>
							<th scope="col">{c.tag}</th>
							<th scope="col">{c.category}</th>
							<th scope="col" className="num">
								{c.share}
							</th>
							<th scope="col" className="num">
								{c.votes}
							</th>
						</tr>
					</thead>
					<tbody>
						{list.tags.map((tag) => (
							<tr key={tag.id}>
								<th scope="row">
									<Link href={`/charts?tag=${tag.id}`} prefetch={false}>
										{tag.name}
									</Link>
								</th>
								<td>{tag.category || "—"}</td>
								<td className="num">
									<span className="song-tag-share">
										<span
											className="song-tag-bar"
											aria-hidden="true"
											style={{ "--share": tag.share } as CSSProperties}
										/>
										<span className="song-tag-pct">{`${Math.round(tag.share * 100)}%`}</span>
									</span>
								</td>
								<td className="num">{tag.votes}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="field-hint">
				{fill(c.total, { n: list.total, level })}
				{date ? ` ${fill(c.source, { date })}` : null} ·{" "}
				<Link href="/tags" prefetch={false}>
					{c.how}
				</Link>
			</p>
		</section>
	);
}
