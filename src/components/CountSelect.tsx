"use client";

import { SegRadio } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";

const COUNTS = [33, 40, 50, 60, 80, 99] as const;

/** How many charts the B30-style cards list */
export function CountSelect({
	value,
	onChange,
}: {
	value: number;
	onChange: (next: number) => void;
}) {
	const { m } = useI18n();
	// A count typed into the URL (?count=45) still shows as chosen
	const counts: number[] = COUNTS.includes(value as (typeof COUNTS)[number])
		? [...COUNTS]
		: [...COUNTS, value].sort((a, b) => a - b);
	return (
		<SegRadio
			legend={m.card.charts}
			value={value}
			options={counts.map((n) => ({ value: n, label: n }))}
			onChange={onChange}
			className="opt-count"
		/>
	);
}
