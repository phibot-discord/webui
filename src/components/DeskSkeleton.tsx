"use client";

import { useParams, useSearchParams } from "next/navigation";
import { defaultCardSize } from "@/components/card-shape";
import { useI18n } from "@/i18n/provider";
import { parseCardStyle } from "@/phi/lib/card-styles";
import { CARD_KINDS, CARD_PAGES } from "@/server/card-kinds";

export function DeskSkeleton({ current }: { current?: string }) {
	const { m } = useI18n();
	const params = useParams<{ kind?: string }>();
	const query = useSearchParams();
	const kind = current ?? params?.kind ?? "b30";
	const page = CARD_PAGES.some((p) => p.id === kind);
	const [w, h] = defaultCardSize(
		kind,
		parseCardStyle(kind, query?.get("style")),
	);
	return (
		<main id="content" className="page desk desk-skeleton" aria-busy="true">
			<p className="sr-only" role="status">
				{m.me.loading}
			</p>
			<div className="desk-mast" aria-hidden="true">
				<div className="desk-id">
					<span className="sk sk-name" />
					<span className="sk sk-meta" />
				</div>
				<div className="desk-tools">
					<span className="sk sk-btn sk-btn-wide" />
					<span className="sk sk-btn" />
					<span className="sk sk-btn" />
				</div>
			</div>
			<ul className="card-nav" aria-hidden="true">
				{[...CARD_KINDS, ...CARD_PAGES.map((p) => p.id)].map((key) => (
					<li key={key}>
						<span className="sk-tab" data-current={key === kind || undefined}>
							{m.nav[key]}
						</span>
					</li>
				))}
			</ul>
			{page ? null : (
				<>
					<div className="card-toolbar" aria-hidden="true">
						<span className="sk sk-btn sk-btn-wide" />
						<span className="sk sk-btn sk-btn-icon" />
					</div>
					<div
						className="frame sk-frame"
						aria-hidden="true"
						data-tall={h / w > 3 || undefined}
						style={{ aspectRatio: `${w} / ${h}` }}
					/>
				</>
			)}
		</main>
	);
}
