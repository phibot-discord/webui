"use client";

import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import {
	localizeChartTagDescription,
	localizeChartTagName,
} from "@/phi/lib/card-i18n";

export function TagGlossary({ tree }: { tree: ChartTagTreeNode[] }) {
	const { locale, m } = useI18n();
	const t = m.tags;
	const cats = tree.map((cat, i) => ({
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
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<div className="tag-layout">
				<nav className="tag-index" aria-label={t.index}>
					<p className="tag-index-label">{t.guide}</p>
					<ul>
						<li>
							<a href="#formula">
								<span>{t.howTitle}</span>
							</a>
						</li>
						<li>
							<a href="#read">
								<span>{t.readTitle}</span>
							</a>
						</li>
					</ul>
					{cats.length ? (
						<>
							<p className="tag-index-label">{t.index}</p>
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
						</>
					) : null}
				</nav>
				<div className="tag-glossary">
					<section
						className="tag-cat tag-guide"
						id="formula"
						aria-labelledby="formula-h"
					>
						<div className="tag-cat-head">
							<h3 id="formula-h">{t.howTitle}</h3>
						</div>
						<dl className="tag-formula">
							{t.how.map((step) => (
								<div key={step.term}>
									<dt>{step.term}</dt>
									<dd>
										{step.formula ? <code>{step.formula}</code> : null}
										<span>{step.text}</span>
									</dd>
								</div>
							))}
						</dl>
					</section>
					<section
						className="tag-cat tag-guide"
						id="read"
						aria-labelledby="read-h"
					>
						<div className="tag-cat-head">
							<h3 id="read-h">{t.readTitle}</h3>
						</div>
						<ul className="tag-read">
							{t.read.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
						<p className="tag-guide-link">
							<Link href="/profile" prefetch={false}>
								{t.profileLink}
							</Link>
						</p>
					</section>
					{cats.length ? (
						cats.map((cat) => (
							<section
								className="tag-cat"
								key={cat.id}
								id={cat.id}
								aria-labelledby={`${cat.id}-h`}
							>
								<div className="tag-cat-head">
									<h3 id={`${cat.id}-h`}>{cat.name}</h3>
									<span className="tag-cat-count">
										{t.count.replaceAll("{n}", String(cat.tags.length))}
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
						))
					) : (
						<p className="lede">{t.empty}</p>
					)}
				</div>
			</div>
		</>
	);
}
