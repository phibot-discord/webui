"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { Messages } from "@/i18n/messages";
import { chapterTip, chipName } from "@/lib/collection";
import { collectionHref } from "@/lib/files-view";
import { revealInRow, rowFade } from "@/lib/scroll";
import { fill } from "@/phi/lib/card-i18n";
import { FilesLink } from "./FilesLink";

export type ViewChapter = {
	id: string;
	kind: string;
	short: string;
	label: string;
	name: string;
	count: number;
};

export function CollectionNav({
	chapters,
	currentId,
	lang,
	t,
}: {
	chapters: ViewChapter[];
	currentId: string;
	lang?: string;
	t: Messages["collection"];
}) {
	const list = useRef<HTMLUListElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs again when the current chapter changes, read from the DOM
	useLayoutEffect(() => {
		const row = list.current;
		const chip = row?.querySelector<HTMLElement>('[aria-current="page"]');
		if (row && chip) revealInRow(row, chip);
	}, [currentId]);

	useEffect(() => {
		const row = list.current;
		if (!row) return;
		const update = () => {
			row.dataset.fade = rowFade(
				row.scrollLeft,
				row.scrollWidth - row.clientWidth,
			);
		};
		const hideTip = (event: KeyboardEvent) => {
			if (event.key === "Escape") row.dataset.tip = "off";
		};
		const showTip = () => {
			delete row.dataset.tip;
		};
		update();
		row.addEventListener("scroll", update, { passive: true });
		row.addEventListener("pointerleave", showTip);
		row.addEventListener("focusin", showTip);
		document.addEventListener("keydown", hideTip);
		const ro = new ResizeObserver(update);
		ro.observe(row);
		return () => {
			row.removeEventListener("scroll", update);
			row.removeEventListener("pointerleave", showTip);
			row.removeEventListener("focusin", showTip);
			document.removeEventListener("keydown", hideTip);
			ro.disconnect();
		};
	}, []);

	return (
		<nav className="coll-chapters" aria-label={t.chaptersLabel}>
			<ul className="coll-chips row-fade" ref={list}>
				{chapters.map((chapter, at) => {
					const tip = chapterTip(
						chapter,
						fill(t.itemCount, { n: chapter.count }),
					);
					const start = at > 0 && chapters[at - 1]?.kind !== chapter.kind;
					const end = at >= chapters.length / 2;
					return (
						<li
							key={chapter.id}
							data-start={start ? "" : undefined}
							data-end={end ? "" : undefined}
						>
							<FilesLink
								className="coll-chip"
								href={collectionHref(chapter.id, lang)}
								aria-current={chapter.id === currentId ? "page" : undefined}
								aria-label={chipName(chapter.short, tip)}
							>
								{chapter.short}
								<span className="coll-chip-tip" aria-hidden="true">
									<span>{tip}</span>
								</span>
							</FilesLink>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
