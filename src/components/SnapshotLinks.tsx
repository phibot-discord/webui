"use client";

import type { ReactNode } from "react";
import { DownloadSimple, ImageSquare } from "@/components/icons";
import { useI18n } from "@/i18n/provider";

export function SnapshotLinks({
	view,
	level,
	lead,
}: {
	view: "progress" | "targets" | "type" | "suits" | "achievements";
	level?: number;
	lead?: ReactNode;
}) {
	const { m, locale } = useI18n();
	const t = m.snapshot;
	const query: Record<string, string> = { view, lang: locale };
	if (level !== undefined) query.level = String(level);
	const href = `/api/snapshot?${new URLSearchParams(query)}`;
	return (
		<div className="snap-links">
			{lead}
			<a className="btn btn-ghost" href={href} target="_blank" rel="noopener">
				<ImageSquare size={16} weight="bold" aria-hidden />
				{t.open}
			</a>
			<a className="btn btn-ghost" href={`${href}&download=1`} download>
				<DownloadSimple size={16} weight="bold" aria-hidden />
				{t.download}
			</a>
			<p className="field-hint">{t[view]}</p>
		</div>
	);
}
