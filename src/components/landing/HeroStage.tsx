"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { SHOTS, srcSet } from "@/components/landing/Scoreboard";
import { useI18n } from "@/i18n/provider";

type NoteKind = "tap" | "drag" | "flick" | "hold";

const NOTES: { lane: number; kind: NoteKind; d: number; rest: number }[] = [
	{ lane: 0, kind: "tap", d: 0, rest: 0.22 },
	{ lane: 3, kind: "drag", d: 0.45, rest: 0.6 },
	{ lane: 5, kind: "tap", d: 0.9, rest: 0.36 },
	{ lane: 1, kind: "hold", d: 1.35, rest: 0.74 },
	{ lane: 6, kind: "flick", d: 1.8, rest: 0.14 },
	{ lane: 2, kind: "tap", d: 2.25, rest: 0.5 },
	{ lane: 4, kind: "drag", d: 2.7, rest: 0.86 },
	{ lane: 6, kind: "tap", d: 3.15, rest: 0.44 },
	{ lane: 0, kind: "flick", d: 3.6, rest: 0.64 },
	{ lane: 3, kind: "tap", d: 4.05, rest: 0.08 },
];

const FAN_SIZES: Record<string, string> = {
	phone: "(min-width: 960px) 180px, 30vw",
	table: "(min-width: 960px) 340px, 56vw",
	classic: "(min-width: 960px) 380px, 62vw",
};

export function HeroStage() {
	const { m } = useI18n();
	const ref = useRef<HTMLDivElement>(null);
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		const node = ref.current;
		if (!node || typeof IntersectionObserver === "undefined") return;
		const io = new IntersectionObserver((entries) => {
			const seen = entries.at(-1)?.isIntersecting ?? true;
			node.toggleAttribute("data-offscreen", !seen);
		});
		io.observe(node);
		return () => io.disconnect();
	}, []);

	return (
		<div ref={ref} className="hero-stage" data-paused={paused || undefined}>
			<div className="hero-lane" aria-hidden="true">
				<div className="hero-notes">
					{NOTES.map((n) => (
						<span
							key={`${n.lane}-${n.d}`}
							className={`note is-${n.kind}`}
							style={{
								["--lane" as string]: n.lane,
								["--d" as string]: n.d,
								["--rest" as string]: n.rest,
							}}
						/>
					))}
				</div>
				<div className="hero-judge" />
			</div>
			<div className="hero-fan" aria-hidden="true">
				{["phone", "table", "classic"].map((layout) => {
					const s = SHOTS.find((shot) => shot.layout === layout);
					if (!s) return null;
					return (
						<picture key={layout} className={`fan-card is-${layout}`}>
							<source
								type="image/avif"
								srcSet={srcSet(s.file, s.widths, "avif")}
								sizes={FAN_SIZES[layout]}
							/>
							<img
								src={`/landing/${s.file}-${s.widths[0]}.webp`}
								srcSet={srcSet(s.file, s.widths, "webp")}
								sizes={FAN_SIZES[layout]}
								alt=""
								width={s.width}
								height={s.height}
								fetchPriority={layout === "classic" ? "high" : undefined}
								decoding="async"
							/>
						</picture>
					);
				})}
			</div>
			<button
				type="button"
				className="stage-toggle"
				aria-pressed={paused}
				aria-label={m.home.pauseMotion}
				title={m.home.pauseMotion}
				onClick={() => setPaused((p) => !p)}
			>
				{paused ? (
					<Play size={16} weight="fill" aria-hidden="true" />
				) : (
					<Pause size={16} weight="fill" aria-hidden="true" />
				)}
			</button>
		</div>
	);
}
