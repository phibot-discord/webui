"use client";

import { useSearchParams } from "next/navigation";
import { FilesViews } from "@/components/FilesViews";
import type { Messages } from "@/i18n/messages";
import { navView, parseView } from "@/lib/files-view";

export type FilesSkeletonCopy = Pick<
	Messages["files"],
	"viewsLabel" | "views" | "loading"
>;

export function FilesSkeleton({ t }: { t: FilesSkeletonCopy }) {
	const query = useSearchParams();
	const view = navView(parseView(query?.get("view") ?? undefined));
	return (
		<main id="content" className="page files-page" aria-busy="true">
			<FilesViews view={view} t={t} />
			<p className="sr-only" role="status">
				{t.loading}
			</p>
			<div className="files-skeleton" aria-hidden="true">
				<span className="sk sk-crumb" />
				<span className="sk sk-title" />
				<span className="sk sk-lede" />
				{view === "pv" ? (
					<div className="pv-layout">
						<span className="sk sk-stage" />
						<span className="sk sk-list" />
					</div>
				) : view === "files" ? (
					<div className="asset-loading">
						{[0, 1, 2].map((n) => (
							<div key={n} className="asset-skeleton">
								<span />
								<span />
							</div>
						))}
					</div>
				) : (
					<div className="sk-lines">
						{[0, 1, 2, 3, 4, 5].map((n) => (
							<span key={n} className="sk sk-line" />
						))}
					</div>
				)}
			</div>
		</main>
	);
}
