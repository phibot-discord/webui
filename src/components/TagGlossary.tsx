"use client";

import { Play } from "@phosphor-icons/react";
import { useState } from "react";
import Link from "@/components/LocaleLink";
import { type ActiveClip, TagClipDialog } from "@/components/TagClipDialog";
import { TagExample } from "@/components/TagExample";
import { useI18n } from "@/i18n/provider";
import type { TagExample as Example } from "@/lib/tag-example";
import type { ChartTagTreeNode } from "@/phi/lib/b30-analysis";
import {
	fill,
	localizeChartTagDescription,
	localizeChartTagName,
} from "@/phi/lib/card-i18n";
import type { TagClipView } from "@/server/tag-clips";

export function TagGlossary({
	tree,
	clips,
	example,
	voted,
}: {
	tree: ChartTagTreeNode[];
	clips: Record<string, TagClipView>;
	example: Example;
	voted: string;
}) {
	const { locale, m } = useI18n();
	const t = m.tags;
	const [active, setActive] = useState<ActiveClip | null>(null);
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
			<p className="lede">
				{t.lede}
				{Object.keys(clips).length
					? `${locale === "en" ? " " : ""}${t.clipIntro}`
					: null}
			</p>
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
							<a href="#example">
								<span>{t.exampleTitle}</span>
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
					<TagExample example={example} voted={voted} />
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
										{cat.tags.map((tag) => {
											const clip = clips[tag.key];
											return (
												<div key={tag.key}>
													<dt>{tag.name}</dt>
													{tag.description ? <dd>{tag.description}</dd> : null}
													{clip ? (
														<dd className="tag-clip-row">
															<button
																type="button"
																className="tag-clip"
																aria-haspopup="dialog"
																aria-label={fill(t.clipFor, {
																	tag: tag.name,
																	title: clip.title,
																	level: clip.level,
																})}
																onClick={() =>
																	setActive({
																		name: tag.name,
																		...(tag.description
																			? { description: tag.description }
																			: {}),
																		clip,
																	})
																}
															>
																<span
																	className="tag-clip-thumb"
																	aria-hidden="true"
																>
																	{clip.source.cover ? (
																		// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
																		<img
																			src={clip.source.cover}
																			alt=""
																			loading="lazy"
																			decoding="async"
																		/>
																	) : null}
																	<Play size={14} weight="fill" />
																</span>
																<span className="tag-clip-text">
																	<span className="tag-clip-title">
																		{clip.title}
																	</span>
																	<span className="tag-clip-level">
																		{`${clip.level} ${clip.constant.toFixed(1)}`}
																	</span>
																</span>
															</button>
														</dd>
													) : null}
												</div>
											);
										})}
									</dl>
								) : null}
							</section>
						))
					) : (
						<p className="lede">{t.empty}</p>
					)}
				</div>
			</div>
			<TagClipDialog active={active} onClose={() => setActive(null)} />
		</>
	);
}
