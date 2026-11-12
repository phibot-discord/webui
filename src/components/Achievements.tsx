"use client";

import { useI18n } from "@/i18n/provider";
import type { Achievement, AchievementId } from "@/lib/achievements";
import { fill } from "@/phi/lib/card-i18n";

function shareOf(item: Achievement): number {
	if (item.next === null) return 1;
	const from = item.done > 0 ? (item.steps[item.done - 1] ?? 0) : 0;
	return Math.min(1, Math.max(0, (item.have - from) / (item.next - from)));
}

export function Achievements({ items }: { items: Achievement[] }) {
	const { m } = useI18n();
	const t = m.achievements;
	const colors = m.compare.challengeColors;
	const format = (id: AchievementId, n: number): string => {
		switch (id) {
			case "rks":
				return n.toFixed(4);
			case "highAp":
			case "highFc":
				return n.toFixed(1);
			case "floor":
				return `${n.toFixed(2)}%`;
			case "challengeColor":
				return colors[n] || fill(t.colors, { n });
			default:
				return n.toFixed(0);
		}
	};
	const ordered = [
		...items
			.filter((item) => item.next !== null)
			.sort((a, b) => shareOf(b) - shareOf(a)),
		...items.filter((item) => item.next === null),
	];
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
								value={shareOf(item)}
								aria-label={t.names[item.id]}
							/>
						</li>
					);
				})}
			</ul>
		</>
	);
}
