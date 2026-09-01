"use client";

import { useI18n } from "@/i18n/provider";

export function CountSelect({
	value,
	onChange,
}: {
	value: number;
	onChange: (next: number) => void;
}) {
	const { m } = useI18n();

	return (
		<label className="field">
			{m.card.charts}
			<select value={value} onChange={(e) => onChange(Number(e.target.value))}>
				{[33, 40, 50, 60, 80, 99].map((n) => (
					<option key={n} value={n}>
						{n}
					</option>
				))}
			</select>
		</label>
	);
}
