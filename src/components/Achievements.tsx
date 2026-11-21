"use client";

import { useI18n } from "@/i18n/provider";
import {
	type Achievement,
	type AchievementId,
	achievementShare,
	achievementValue,
	orderAchievements,
} from "@/lib/achievements";
import { fill } from "@/phi/lib/card-i18n";

export function Achievements({ items }: { items: Achievement[] }) {
	const { m } = useI18n();
	const t = m.achievements;
	const colors = { names: m.compare.challengeColors, other: t.colors };
	const format = (id: AchievementId, n: number): string =>
		achievementValue(id, n, colors);
	const ordered = orderAchievements(items);
	return (
		<>
			<h2 className="desk-section-title">{t.title}</h2>
			<p className="lede">{t.lede}</p>
			<ul className="ach-grid">
				{ordered.map((item) => {
					const have = format(item.id, item.have);
					return (
						<li
							key={item.id}
							className="ach"
							data-complete={item.next === null || undefined}
						>
							<p className="ach-name">{t.names[item.id]}</p>
							<p className="ach-line">{t.lines[item.id]}</p>
							<p className="ach-state">
								{item.next === null
									? fill(t.complete, { have })
									: fill(t.next, { have, next: format(item.id, item.next) })}
								<span className="muted">
									{fill(t.steps, { done: item.done, total: item.steps.length })}
								</span>
							</p>
							<progress
								className="ach-bar"
								max={1}
								value={achievementShare(item)}
								aria-label={t.names[item.id]}
							/>
						</li>
					);
				})}
			</ul>
		</>
	);
}
