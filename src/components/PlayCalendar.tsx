"use client";

import { useId, useMemo } from "react";
import Link from "@/components/LocaleLink";
import { localeTag } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import type {
	PlayCalendar as CalendarData,
	OnThisDay,
} from "@/lib/play-calendar";
import { fill } from "@/phi/lib/card-i18n";

export function PlayCalendar({
	calendar,
	onThisDay,
}: {
	calendar: CalendarData;
	onThisDay: OnThisDay[];
}) {
	const { locale, m } = useI18n();
	const t = m.trend;
	const ids = useId();
	const fmt = useMemo(
		() =>
			new Intl.DateTimeFormat(localeTag(locale), {
				timeZone: "UTC",
				year: "numeric",
				month: "short",
				day: "numeric",
			}),
		[locale],
	);
	const summary = calendar.best
		? fill(t.calendar.summary, {
				days: calendar.active,
				charts: calendar.total,
				date: fmt.format(Date.parse(`${calendar.best.day}T00:00:00Z`)),
				n: calendar.best.charts,
			})
		: t.calendar.none;

	return (
		<>
			{onThisDay.length > 0 ? (
				<section className="trend-events" aria-labelledby={`${ids}-otd`}>
					<h3 id={`${ids}-otd`} className="sim-list-title">
						{t.onThisDay.title}
					</h3>
					<ul className="otd-list">
						{onThisDay.map((d) => (
							<li key={d.day}>
								{fill(d.rks == null ? t.onThisDay.rowNoRks : t.onThisDay.row, {
									when: t.onThisDay.when[d.years] ?? "",
									date: fmt.format(Date.parse(`${d.day}T00:00:00Z`)),
									rks: d.rks?.toFixed(4) ?? "",
								})}
								{d.charts > 0
									? ` ${fill(t.onThisDay.charts, { n: d.charts })}`
									: ""}{" "}
								<Link href={`/compare?a=me&b=me@${d.day}`} prefetch={false}>
									{t.onThisDay.compare}
								</Link>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section className="trend-events" aria-labelledby={`${ids}-pc`}>
				<h3 id={`${ids}-pc`} className="sim-list-title">
					{t.calendar.title}
				</h3>
				<p className="field-hint">{t.calendar.lede}</p>
				<p className="field-hint">{summary}</p>
				{calendar.best ? (
					<div className="pc-scroll" role="img" aria-label={summary}>
						<div className="pc-grid" aria-hidden="true">
							{calendar.weeks.map((week, w) => (
								<div key={week.find((c) => c)?.day ?? w} className="pc-week">
									{week.map((cell) =>
										cell ? (
											<span
												key={cell.day}
												className="pc-cell"
												data-level={cell.level}
												title={fill(t.calendar.cell, {
													date: fmt.format(Date.parse(`${cell.day}T00:00:00Z`)),
													n: cell.charts,
												})}
											/>
										) : null,
									)}
								</div>
							))}
						</div>
					</div>
				) : null}
			</section>
		</>
	);
}
