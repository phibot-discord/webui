"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useId } from "react";
import { useI18n } from "@/i18n/provider";

export function ExportRecords() {
	const { m } = useI18n();
	const t = m.exportRecords;
	const hintId = useId();
	return (
		<div className="menu-item">
			{(["csv", "json"] as const).map((format) => (
				<a
					key={format}
					className="btn btn-ghost menu-btn"
					href={`/api/me/export?format=${format}`}
					download
					aria-describedby={hintId}
				>
					<DownloadSimple size={18} weight="bold" aria-hidden />
					{format === "csv" ? t.csv : t.json}
				</a>
			))}
			<p className="menu-hint" id={hintId}>
				{t.hint}
			</p>
		</div>
	);
}
