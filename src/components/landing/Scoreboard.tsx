"use client";

import { ArrowSquareOut } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/provider";

/** Preview: the top of the sample card, pre-resized to AVIF and WebP */
const FULL = "/landing/b30-sample-full.webp";
const WIDTHS = [480, 800, 1200, 1600];
const srcSet = (ext: string) =>
	WIDTHS.map((w) => `/landing/b30-sample-${w}.${ext} ${w}w`).join(", ");
/** Rendered width of .board-window: 128% of the panel on phones, ~64vw beside the copy */
const SIZES = "(min-width: 900px) min(64vw, 790px), calc(128vw - 72px)";

export function LandingScoreboard() {
	const { m } = useI18n();
	const t = m.home;
	return (
		<section className="board" aria-labelledby="board-title">
			<div className="board-panel">
				<div className="board-copy">
					<h2 id="board-title">{t.boardTitle}</h2>
					<p className="board-lede">{t.boardLede}</p>
					<p className="board-layouts">
						<span className="flag">{t.newLabel}</span> {t.layouts}
					</p>
					<a
						className="board-link"
						href={FULL}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t.showFull}
						<ArrowSquareOut size={18} aria-hidden="true" />
						<span className="sr-only"> ({t.newTab})</span>
					</a>
				</div>
				<figure className="board-shot">
					<div className="board-window">
						<picture>
							<source type="image/avif" srcSet={srcSet("avif")} sizes={SIZES} />
							<img
								src="/landing/b30-sample-800.webp"
								srcSet={srcSet("webp")}
								sizes={SIZES}
								alt={t.sampleAlt}
								width={2400}
								height={2160}
								loading="lazy"
								decoding="async"
							/>
						</picture>
					</div>
				</figure>
			</div>
		</section>
	);
}
