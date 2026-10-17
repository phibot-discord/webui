"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CollectionLang } from "@/lib/collection";
import { DED_FPS, type DedSoundEvent, DeductionSim } from "@/lib/deduction";
import type { DeductionView } from "./Deduction";
import { DeductionStage } from "./DeductionStage";

const FONT = "PhiStory";
const END_HOLD = 30;

export type DedFrame = {
	frame: number;
	events: DedSoundEvent[];
	ambient: number;
	done: boolean;
};

declare global {
	interface Window {
		__ded?: { fps: number; next: () => DedFrame; ready: boolean };
	}
}

function holdFrames(chars: number): number {
	const seconds = Math.min(4.5, Math.max(1.6, 1 + 0.045 * chars));
	return Math.round(seconds * DED_FPS);
}

export function DeductionRender({
	view,
	lang,
}: {
	view: DeductionView;
	lang: CollectionLang;
}) {
	const sim = useRef<DeductionSim | null>(null);
	sim.current ??= new DeductionSim(view.data, lang);
	const [shown, setShown] = useState(() => sim.current?.view() ?? null);
	const idleSince = useRef<number | null>(null);
	const doneAt = useRef<number | null>(null);

	useEffect(() => {
		const s = sim.current;
		if (!s) return;
		const api = {
			fps: DED_FPS,
			ready: false,
			next(): DedFrame {
				let tap = false;
				if (s.idle) {
					idleSince.current ??= s.at;
					const v = s.view();
					const last = v.lines.filter((l) => l.shown === l.full.length).at(-1);
					const pageEnd = v.lines.every((l) => l.shown === l.full.length);
					const wait = Math.max(
						pageEnd ? DED_FPS : 0,
						holdFrames(last?.full.length ?? 0),
					);
					if (s.at >= idleSince.current + wait) {
						tap = true;
						idleSince.current = null;
					}
				} else {
					idleSince.current = null;
				}
				const frame = s.at;
				const events = s.step(tap);
				const next = s.view();
				flushSync(() => setShown(next));
				if (s.done) doneAt.current ??= frame;
				return {
					frame,
					events,
					ambient: next.ambient,
					done: doneAt.current !== null && frame >= doneAt.current + END_HOLD,
				};
			},
		};
		window.__ded = api;
		const images = [
			...document.querySelectorAll<HTMLImageElement>(".ded-layer"),
		];
		Promise.all([
			document.fonts.load(`28px ${FONT}`),
			...images.map((img) => img.decode().catch(() => undefined)),
		]).then(() => {
			api.ready = true;
		});
		return () => {
			window.__ded = undefined;
		};
	}, []);

	if (!shown) return null;
	return (
		<>
			<style>{`@font-face{font-family:${FONT};src:url("/render/deduction/font") format("truetype");}html,body{margin:0;background:#000;overflow:hidden}.ded-render{position:fixed;inset:0;z-index:2147483647;background:#000}`}</style>
			<div className="ded-render">
				<DeductionStage art={view.art} view={shown} font={FONT} />
			</div>
		</>
	);
}
