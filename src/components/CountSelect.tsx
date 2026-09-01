"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";

export function CountSelect({ value }: { value: number }) {
	const { m } = useI18n();
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	return (
		<label className="field">
			{m.card.charts}
			<select
				value={value}
				onChange={(e) => {
					const next = new URLSearchParams(params);
					next.set("count", e.target.value);
					router.replace(`${pathname}?${next.toString()}`);
				}}
			>
				{[33, 40, 50, 60, 80, 99].map((n) => (
					<option key={n} value={n}>
						{n}
					</option>
				))}
			</select>
		</label>
	);
}
