"use client";

import type { Dispatch, SetStateAction } from "react";

export function ChartScrub({
	label,
	count,
	active,
	setActive,
	readout,
}: {
	label: string;
	count: number;
	active: number | null;
	setActive: Dispatch<SetStateAction<number | null>>;
	readout: (i: number) => string;
}) {
	return (
		<input
			className="chart-scrub"
			type="range"
			min={0}
			max={Math.max(0, count - 1)}
			step={1}
			value={active ?? Math.max(0, count - 1)}
			aria-label={label}
			aria-valuetext={count ? readout(active ?? count - 1) : undefined}
			onChange={(e) => setActive(Number(e.target.value))}
			onFocus={() => setActive((a) => a ?? count - 1)}
			onBlur={() => setActive(null)}
			onKeyDown={(e) => {
				if (e.key === "Escape") setActive(null);
			}}
		/>
	);
}
