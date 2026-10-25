import type { ViewRef } from "@/lib/timeline";

export type RefCopy = { newTab: string; sources: { community: string } };

export function RefLink({ refView, t }: { refView: ViewRef; t: RefCopy }) {
	const fan = refView.community ? (
		<span className="tl-ref-fan">{t.sources.community}</span>
	) : null;
	return refView.external ? (
		<a href={refView.href} target="_blank" rel="noopener noreferrer">
			{refView.label}
			{fan}
			<span className="sr-only"> {t.newTab}</span>
		</a>
	) : (
		<a href={refView.href}>
			{refView.label}
			{fan}
		</a>
	);
}
