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
	return (
		<>
			<h1>{m.tags.title}</h1>
			<p className="lede">{m.tags.lede}</p>
			<div className="tag-glossary">
				{tree.map((cat) => {
					const catDesc = localizeChartTagDescription(
						cat.name,
						cat.description,
						locale,
					);
					const kids = cat.children?.length ? cat.children : [];
					return (
						<section className="tag-cat" key={cat.name}>
							<h2>{localizeChartTagName(cat.name, locale)}</h2>
							{catDesc ? <p className="tag-cat-desc">{catDesc}</p> : null}
							{kids.length ? (
								<dl className="tag-list">
									{kids.map((tag) => {
										const desc = localizeChartTagDescription(
											tag.name,
											tag.description,
											locale,
										);
										return (
											<div key={tag.name}>
												<dt>{localizeChartTagName(tag.name, locale)}</dt>
												{desc ? <dd>{desc}</dd> : null}
											</div>
										);
									})}
								</dl>
							) : null}
						</section>
					);
				})}
			</div>
		</>
	);
}
