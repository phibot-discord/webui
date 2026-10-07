"use client";

import { useI18n } from "@/i18n/provider";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import {
	localizeChartTagDescription,
	localizeChartTagName,
} from "@/phi/lib/card-i18n";

export function TagGlossary({ tree }: { tree: ChartTagTreeNode[] }) {
	const { locale, m } = useI18n();
	if (!tree.length) {
		return (
			<>
				<h1>{m.tags.title}</h1>
				<p className="lede">{m.tags.empty}</p>
			</>
		);
	}
	const cats = tree.map((cat, i) => ({
		// Short, stable anchors: a category link can be shared
		id: `cat-${i + 1}`,
		name: localizeChartTagName(cat.name, locale),
		description: localizeChartTagDescription(cat.name, cat.description, locale),
		tags: (cat.children ?? []).map((tag) => ({
			key: tag.name,
			name: localizeChartTagName(tag.name, locale),
			description: localizeChartTagDescription(
				tag.name,
				tag.description,
				locale,
			),
		})),
	}));
	return (
		<>
			<h1>{m.tags.title}</h1>
			<p className="lede">{m.tags.lede}</p>
			<div className="tag-layout">
				<nav className="tag-index" aria-label={m.tags.index}>
					<ul>
						{cats.map((cat) => (
							<li key={cat.id}>
								<a href={`#${cat.id}`}>
									<span>{cat.name}</span>
									<span className="tag-index-count" aria-hidden="true">
										{cat.tags.length}
									</span>
								</a>
							</li>
						))}
					</ul>
				</nav>
				<div className="tag-glossary">
					{cats.map((cat) => (
						<section
							className="tag-cat"
							key={cat.id}
							id={cat.id}
							aria-labelledby={`${cat.id}-h`}
						>
							<div className="tag-cat-head">
								<h2 id={`${cat.id}-h`}>{cat.name}</h2>
								<span className="tag-cat-count">
									{m.tags.count.replaceAll("{n}", String(cat.tags.length))}
								</span>
							</div>
							{cat.description ? (
								<p className="tag-cat-desc">{cat.description}</p>
							) : null}
							{cat.tags.length ? (
								<dl className="tag-list">
									{cat.tags.map((tag) => (
										<div key={tag.key}>
											<dt>{tag.name}</dt>
											{tag.description ? <dd>{tag.description}</dd> : null}
										</div>
									))}
								</dl>
							) : null}
						</section>
					))}
				</div>
			</div>
		</>
	);
}
