"use client";

import {
	type CSSProperties,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";
import { CardViewer } from "@/components/CardViewer";
import { DownloadSimple } from "@/components/icons";
import Link from "@/components/LocaleLink";
import { PgtiCard } from "@/components/review/PgtiCard";
import { ReviewBoard } from "@/components/review/ReviewBoard";
import { type DeckHandle, ReviewDeck } from "@/components/review/ReviewDeck";
import { useHydrated } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { deckCards } from "@/lib/review-deck";
import { REVIEW_YEAR, reviewPath } from "@/lib/review-window";
import { fill } from "@/phi/lib/card-i18n";
import type { ReviewView } from "@/server/review";

const HAND = [0, 1, 2, 3, 4];
const AMBIENT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function YearReview({ view }: { view: ReviewView }) {
	const { m, locale } = useI18n();
	const t = m.wrapped;
	const [file, setFile] = useState<string>();
	const hydrated = useHydrated();
	const deck = useRef<DeckHandle>(null);
	const factsTitle = useRef<HTMLHeadingElement>(null);
	const typeTitle = useRef<HTMLHeadingElement>(null);
	const replay = view.state === "ok" ? view.replay : null;
	const tiles = view.state === "ok" ? view.tiles : null;
	const hasType = view.state === "ok" && view.pgti !== null;
	const cards = useMemo(
		() => (replay && tiles ? deckCards({ replay, tiles, hasType }) : null),
		[replay, tiles, hasType],
	);
	const reach = useCallback((heading: HTMLHeadingElement | null) => {
		if (!heading) return;
		const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		heading.scrollIntoView({
			block: "start",
			behavior: still ? "auto" : "smooth",
		});
		heading.focus({ preventScroll: true });
	}, []);
	const toFacts = useCallback(() => reach(factsTitle.current), [reach]);
	const toType = useCallback(() => reach(typeTitle.current), [reach]);
	const [headBefore = "", headAfter = ""] = t.heading.split("{year}");
	const heading = (year: number) => (
		<h1>
			{headBefore}
			<span className="recap-year">{year}</span>
			{headAfter}
		</h1>
	);
	if (view.state === "soon") {
		return (
			<>
				{heading(REVIEW_YEAR)}
				<p className="lede">{fill(t.soon, { day: view.opens })}</p>
				<p>{t.soonHint}</p>
			</>
		);
	}
	const title = fill(t.title, { year: view.year });
	const hand = (
		<>
			{HAND.map((k) => (
				<i key={k} style={{ "--k": k } as CSSProperties} />
			))}
			<span>PhiBot.dev</span>
		</>
	);
	const src = `/api/snapshot?${new URLSearchParams({ view: "review", lang: locale, year: String(view.year) })}`;
	return (
		<>
			<header className="recap-hero">
				<div className="recap-hero-text">
					{heading(view.year)}
					<p className="lede">{t.lede}</p>
				</div>
				{cards && hydrated ? (
					<button
						type="button"
						className="recap-hero-art"
						aria-label={t.deck.again}
						title={t.deck.again}
						onClick={() => deck.current?.deal()}
					>
						{hand}
					</button>
				) : (
					<div className="recap-hero-art" aria-hidden="true">
						{hand}
					</div>
				)}
			</header>
			{view.years.length > 1 ? (
				<nav className="review-years" aria-label={t.years}>
					{view.years.map((year) => (
						<Link
							key={year}
							className="btn btn-ghost btn-sm"
							href={reviewPath(year)}
							prefetch={false}
							aria-current={year === view.year ? "page" : undefined}
						>
							{year}
						</Link>
					))}
				</nav>
			) : null}
			{view.state === "ok" ? (
				<>
					{view.soFar ? <p className="field-hint">{t.soFar}</p> : null}
					{view.replay ? (
						<div className="dk-slot">
							<div className="dk-ambient" aria-hidden="true">
								{AMBIENT.map((k) => (
									<i key={k} style={{ "--k": k } as CSSProperties} />
								))}
								<span className="dk-side dk-side-start">
									{t.deck.flick}
									<svg viewBox="0 0 80 40" aria-hidden="true">
										<path d="M4 30 C 24 4, 52 4, 70 22" />
										<path d="M58 22 L72 24 L68 10" />
									</svg>
								</span>
								<span className="dk-side dk-side-end">
									<svg viewBox="0 0 80 40" aria-hidden="true">
										<path d="M76 30 C 56 4, 28 4, 10 22" />
										<path d="M22 22 L8 24 L12 10" />
									</svg>
									{t.deck.keep}
								</span>
							</div>
							{hydrated ? (
								<ReviewDeck
									key={view.year}
									ref={deck}
									year={view.year}
									replay={view.replay}
									tiles={view.tiles}
									pgti={view.pgti}
									onWhy={toType}
									onSkip={toFacts}
								/>
							) : (
								<div className="dk" aria-hidden="true">
									<div className="dk-steps" />
									<div className="dk-pile" />
									<div className="dk-ctl" />
								</div>
							)}
						</div>
					) : null}
					<h3 ref={factsTitle} className="review-facts-title" tabIndex={-1}>
						{t.facts}
					</h3>
					<p className="review-range">{view.range}</p>
					<ReviewBoard
						tiles={view.tiles}
						cards={hydrated ? cards : null}
						onShow={(card) => deck.current?.showCard(card)}
					/>
					<PgtiCard pgti={view.pgti} titleRef={typeTitle} />
					<CardViewer
						src={src}
						alt={fill(t.alt, { year: view.year })}
						name={title}
						sizeKey={`review-${view.size[1]}`}
						defaultSize={view.size}
						onFile={setFile}
					/>
					<div className="snap-links">
						{file ? (
							<a
								className="btn btn-ghost"
								href={file}
								download={`phibot-recap-${view.year}.png`}
							>
								<DownloadSimple size={16} weight="bold" aria-hidden />
								{m.snapshot.download}
							</a>
						) : (
							<button
								type="button"
								className="btn btn-ghost"
								aria-disabled="true"
							>
								<DownloadSimple size={16} weight="bold" aria-hidden />
								{m.snapshot.download}
							</button>
						)}
					</div>
					<p className="field-hint">{view.note}</p>
				</>
			) : (
				<p className="callout">{view.message}</p>
			)}
		</>
	);
}
