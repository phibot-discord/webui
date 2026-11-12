"use client";

import { usePathname, useRouter } from "next/navigation";
import {
	type CSSProperties,
	useEffect,
	useState,
	useSyncExternalStore,
	useTransition,
} from "react";
import { useI18n } from "@/i18n/provider";
import {
	countdownParts,
	REVIEW_OPENS_AT,
	reviewSecondsLeft,
} from "@/lib/review-window";

const UNITS = ["days", "hours", "minutes", "seconds"] as const;
const ONE = {
	days: "day",
	hours: "hour",
	minutes: "minute",
	seconds: "second",
} as const;
const SLACK = 20;
const OPEN_PAUSE = 1300;

function watchClock(tick: () => void): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const arm = () => {
		clearTimeout(timer);
		const left = REVIEW_OPENS_AT - Date.now();
		if (left <= 0) return;
		timer = setTimeout(
			() => {
				tick();
				arm();
			},
			(left % 1000 || 1000) + SLACK,
		);
	};
	const wake = () => {
		if (document.visibilityState !== "visible") return;
		tick();
		arm();
	};
	arm();
	document.addEventListener("visibilitychange", wake);
	return () => {
		clearTimeout(timer);
		document.removeEventListener("visibilitychange", wake);
	};
}

const readLeft = () => reviewSecondsLeft(Date.now());
const noClock = () => null;

function digitsOf(n: number | undefined): { place: number; digit: string }[] {
	const text = n === undefined ? "  " : String(n).padStart(2, "0");
	return [...text].map((digit, at) => ({
		place: text.length - at,
		digit: digit.trim(),
	}));
}

function Flap({ value }: { value: string }) {
	const [shown, setShown] = useState<{
		now: string;
		was: string | null;
		turn: number;
	}>({ now: value, was: null, turn: 0 });
	if (shown.now !== value)
		setShown({ now: value, was: shown.now, turn: shown.turn + 1 });
	const { now, was, turn } = shown;
	return (
		<span className="cd-flap">
			<span className="cd-half" data-half="top">
				<b>{now}</b>
			</span>
			<span className="cd-half" data-half="bottom">
				<b>{was ?? now}</b>
			</span>
			{was !== null ? (
				<>
					<span
						key={`fold-${turn}`}
						className="cd-half cd-fold"
						data-half="top"
					>
						<b>{was}</b>
					</span>
					<span
						key={`land-${turn}`}
						className="cd-half cd-land"
						data-half="bottom"
					>
						<b>{now}</b>
					</span>
				</>
			) : null}
		</span>
	);
}

export function RecapCountdown() {
	const { m } = useI18n();
	const t = m.wrapped.countdown;
	const router = useRouter();
	const pathname = usePathname();
	const left = useSyncExternalStore(watchClock, readLeft, noClock);
	const [tried, setTried] = useState(false);
	const [opening, startOpening] = useTransition();
	const done = left === 0;

	useEffect(() => {
		if (!done || tried) return;
		const timer = setTimeout(() => {
			setTried(true);
			startOpening(() => router.refresh());
		}, OPEN_PAUSE);
		return () => clearTimeout(timer);
	}, [done, tried, router]);

	const parts = left === null ? null : countdownParts(left);
	const units = UNITS.map((unit) => {
		const n = parts?.[unit];
		return {
			unit,
			label: t[unit],
			spoken: n === undefined ? "" : `${n} ${t[n === 1 ? ONE[unit] : unit]}`,
			digits: digitsOf(n),
		};
	});
	const spoken = units.map((u) => u.spoken).join(" ");
	return (
		<div className="cd" data-done={done ? "" : undefined}>
			<div
				className="cd-row"
				role="timer"
				aria-label={spoken.trim() ? `${t.label}: ${spoken}` : t.label}
				data-wide={units[0]!.digits.length > 2 ? "" : undefined}
			>
				{units.map(({ unit, label, digits }, index) => (
					<span
						key={unit}
						className="cd-unit"
						data-unit={unit}
						style={{ "--i": index } as CSSProperties}
						aria-hidden="true"
					>
						<span className="cd-digits">
							{digits.map(({ place, digit }) => (
								<Flap key={place} value={digit} />
							))}
						</span>
						<span className="cd-label">{label}</span>
					</span>
				))}
			</div>
			{done ? (
				<p className="cd-open" role="status">
					{tried && !opening ? (
						<a className="btn btn-primary" href={pathname}>
							{t.open}
						</a>
					) : (
						t.opening
					)}
				</p>
			) : null}
		</div>
	);
}
