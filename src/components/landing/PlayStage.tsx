"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

type NoteKind = "tap" | "drag" | "hold";

/** `rest` is where a note sits when motion is reduced, as a fraction of the fall */
const NOTES: { lane: number; kind: NoteKind; d: number; rest: number }[] = [
	{ lane: 0, kind: "tap", d: 0, rest: 0.18 },
	{ lane: 2, kind: "drag", d: 0.55, rest: 0.62 },
	{ lane: 1, kind: "tap", d: 1.1, rest: 0.4 },
	{ lane: 3, kind: "hold", d: 1.6, rest: 0.7 },
	{ lane: 4, kind: "tap", d: 2.2, rest: 0.28 },
	{ lane: 1, kind: "drag", d: 2.75, rest: 0.84 },
	{ lane: 3, kind: "tap", d: 3.3, rest: 0.08 },
	{ lane: 0, kind: "hold", d: 3.9, rest: 0.52 },
	{ lane: 2, kind: "tap", d: 4.4, rest: 0.34 },
];

/**
 * Decorative falling notes. The motion stops while the stage is off-screen
 * and when the visitor presses pause; with reduced motion it never starts
 */
export function PlayStage() {
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
		<div ref={ref} className="stage" data-paused={paused || undefined}>
			<div className="stage-lane" aria-hidden="true">
				<div className="stage-notes">
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
				<div className="stage-judge" />
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
