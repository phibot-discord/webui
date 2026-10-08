"use client";

import {
	ArrowSquareOut,
	DeviceMobile,
	SquaresFour,
	Table,
} from "@phosphor-icons/react";
import { type KeyboardEvent, useId, useRef, useState } from "react";
import { LevelChip } from "@/components/landing/LevelChip";
import { useI18n } from "@/i18n/provider";

type Layout = "classic" | "table" | "phone";

type Shot = {
	layout: Layout;
	file: string;
	widths: number[];
	width: number;
	height: number;
	Icon: typeof Table;
};

export const SHOTS: Shot[] = [
	{
		layout: "classic",
		file: "b30-sample",
		widths: [480, 800, 1200, 1600],
		width: 2400,
		height: 2160,
		Icon: SquaresFour,
	},
	{
		layout: "table",
		file: "b30-table",
		widths: [640, 1280],
		width: 2400,
		height: 2160,
		Icon: Table,
	},
	{
		layout: "phone",
		file: "b30-phone",
		widths: [320, 640],
		width: 1280,
		height: 2304,
		Icon: DeviceMobile,
	},
];

const FULL = "/landing/b30-sample-full.webp";

export const srcSet = (file: string, widths: number[], ext: string) =>
	widths.map((w) => `/landing/${file}-${w}.${ext} ${w}w`).join(", ");

const sizes = (layout: Layout) =>
	layout === "phone"
		? "(min-width: 1024px) min(18vw, 290px), 38vw"
		: "(min-width: 1024px) min(38vw, 590px), 80vw";

function LayoutPreview() {
	const { m } = useI18n();
	const t = m.home;
	const id = useId();
	const [active, setActive] = useState(0);
	const tabs = useRef<(HTMLButtonElement | null)[]>([]);

	const onKeyDown = (e: KeyboardEvent) => {
		const last = SHOTS.length - 1;
		const to =
			e.key === "ArrowRight"
				? active === last
					? 0
					: active + 1
				: e.key === "ArrowLeft"
					? active === 0
						? last
						: active - 1
					: e.key === "Home"
						? 0
						: e.key === "End"
							? last
							: null;
		if (to === null) return;
		e.preventDefault();
		setActive(to);
		tabs.current[to]?.focus();
	};

	return (
		<div className="preview">
			<div className="preview-stage">
				{SHOTS.map((s, i) => (
					<div
						key={s.layout}
						id={`${id}-panel-${s.layout}`}
						role="tabpanel"
						aria-labelledby={`${id}-tab-${s.layout}`}
						className={`preview-shot is-${s.layout}`}
						data-active={i === active || undefined}
						inert={i !== active}
					>
						<picture>
							<source
								type="image/avif"
								srcSet={srcSet(s.file, s.widths, "avif")}
								sizes={sizes(s.layout)}
							/>
							<img
								src={`/landing/${s.file}-${s.widths[0]}.webp`}
								srcSet={srcSet(s.file, s.widths, "webp")}
								sizes={sizes(s.layout)}
								alt={t.layouts[s.layout].alt}
								width={s.width}
								height={s.height}
								loading="lazy"
								decoding="async"
							/>
						</picture>
					</div>
				))}
			</div>
			<div
				role="tablist"
				aria-label={t.layoutsLabel}
				className="preview-tabs"
				style={{ ["--i" as string]: active }}
			>
				<span className="preview-slider" aria-hidden="true" />
				{SHOTS.map((s, i) => (
					<button
						key={s.layout}
						ref={(el) => {
							tabs.current[i] = el;
						}}
						id={`${id}-tab-${s.layout}`}
						type="button"
						role="tab"
						className="preview-tab"
						aria-selected={i === active}
						aria-controls={`${id}-panel-${s.layout}`}
						tabIndex={i === active ? 0 : -1}
						onClick={() => setActive(i)}
						onKeyDown={onKeyDown}
					>
						{t.layouts[s.layout].name}
					</button>
				))}
			</div>
		</div>
	);
}

export function LandingScoreboard() {
	const { m } = useI18n();
	const t = m.home;
	return (
		<section className="landing-section" aria-labelledby="board-title">
			<header className="section-head">
				<LevelChip rank="EZ" level="4" />
				<h2 id="board-title" className="section-title">
					{t.boardTitle}
				</h2>
			</header>
			<div className="lcard-grid">
				<div className="lcard lcard-secondary lcard-flush">
					<LayoutPreview />
				</div>
				<div className="layouts-copy">
					<h3 className="lcard-title">
						{t.layoutsTitle}
						<span className="badge">{t.newLabel}</span>
					</h3>
					<p>{t.boardLede}</p>
					<ul className="feature-list">
						{SHOTS.map(({ layout, Icon }) => (
							<li key={layout} className="feature">
								<span className="feature-icon">
									<Icon size={20} aria-hidden="true" />
								</span>
								<span className="feature-line">{t.layouts[layout].name}</span>
								<span className="feature-sub">{t.layouts[layout].blurb}</span>
							</li>
						))}
					</ul>
					<a
						className="land-link"
						href={FULL}
						target="_blank"
						rel="noopener noreferrer"
					>
						{t.showFull}
						<ArrowSquareOut size={16} aria-hidden="true" />
						<span className="sr-only"> ({t.newTab})</span>
					</a>
				</div>
			</div>
		</section>
	);
}
