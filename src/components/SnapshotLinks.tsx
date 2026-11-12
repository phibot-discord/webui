"use client";

import { DownloadSimple, ImageSquare } from "@/components/icons";
import { useI18n } from "@/i18n/provider";

export function SnapshotLinks({ view }: { view: "progress" | "targets" }) {
	const { m, locale } = useI18n();
	const t = m.snapshot;
	const href = `/api/snapshot?${new URLSearchParams({ view, lang: locale })}`;
	return (
		<div className="snap-links">
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
