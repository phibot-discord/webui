"use client";

import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Pgti } from "@/lib/pgti";
import type { ReplayInput, ReplayMark } from "@/lib/review-deck";
import type { WrappedDay, WrappedTile } from "@/lib/wrapped";

export type DeckData = {
	year: number;
	replay: ReplayInput;
	tiles: readonly WrappedTile[];
	pgti: Pgti | null;
	marks: Partial<Record<ReplayMark["kind"], ReplayMark>>;
	monthName: (month: number) => string;
	line: (day: WrappedDay) => string;
	finish: "ALL PERFECT" | "FULL COMBO" | null;
	why: () => void;
	skip: () => void;
	again: () => void;
};

export const REDUCE = "(prefers-reduced-motion: reduce)";

export const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(4)}`;

export const whole = (value: string | undefined) =>
	value !== undefined && /^\d+$/.test(value) ? Number(value) : 0;

export const vars = (values: Record<string, string | number>) =>
	values as CSSProperties;

export function Face({ n, children }: { n: number; children: ReactNode }) {
	return (
		<div className="dk-face" data-n={n}>
			<span className="dk-corner" aria-hidden="true">
				{n}
				<i />
			</span>
			<div className="dk-body">{children}</div>
			<span className="dk-brand" aria-hidden="true">
				<i />
				PhiBot.dev
			</span>
			<span className="dk-corner dk-corner-end" aria-hidden="true">
				{n}
				<i />
			</span>
		</div>
	);
}

export function Roll({
	value,
	active,
	className,
}: {
	value: number;
	active: boolean;
	className?: string;
}) {
	const out = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		const el = out.current;
		if (!el) return;
		if (!active || !(value > 0) || window.matchMedia(REDUCE).matches) {
			el.textContent = String(value);
			return;
		}
		const start = performance.now();
		const span = Math.min(900, 420 + value * 6);
		let frame = 0;
		const step = (now: number) => {
			const p = Math.min(1, (now - start) / span);
			el.textContent = String(Math.round(value * (1 - (1 - p) ** 3)));
			if (p < 1) frame = requestAnimationFrame(step);
		};
		el.textContent = "0";
		frame = requestAnimationFrame(step);
		return () => {
			cancelAnimationFrame(frame);
			el.textContent = String(value);
		};
	}, [value, active]);
	return (
		<span className={className}>
			<span ref={out} aria-hidden="true">
				{value}
			</span>
			<span className="sr-only">{value}</span>
		</span>
	);
}

const BURST = 14;

export function Burst({ mix, delay }: { mix?: boolean; delay?: number }) {
	return (
		<span
			className="dk-burst"
			aria-hidden="true"
			data-mix={mix ? "" : undefined}
			style={vars({ "--wait": `${delay ?? 260}ms` })}
		>
			{Array.from({ length: BURST }, (_, k) => k).map((k) => (
				<i
					key={k}
					style={vars({
						"--a": `${Math.round((360 / BURST) * k + (k % 2) * 9)}deg`,
						"--r": `${5.5 + (k % 3) * 1.6}rem`,
					})}
				/>
			))}
		</span>
	);
}

export function Photo({ src, stand }: { src?: string; stand: string }) {
	const [broken, setBroken] = useState(false);
	return (
		<span className="dk-photo" aria-hidden="true">
			<span className="dk-tape" />
			{src && !broken ? (
				<>
					{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
					<img
						src={src}
						alt=""
						loading="lazy"
						decoding="async"
						draggable={false}
						onError={() => setBroken(true)}
					/>
				</>
			) : (
				<span className="dk-photo-blank">{stand}</span>
			)}
		</span>
	);
}
