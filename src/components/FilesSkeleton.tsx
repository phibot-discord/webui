"use client";

import { useSearchParams } from "next/navigation";
import { FilesViews } from "@/components/FilesViews";
import type { Messages } from "@/i18n/messages";
import { type NavView, navView, parseView } from "@/lib/files-view";

export type FilesSkeletonCopy = Pick<
	Messages["files"],
	"viewsLabel" | "views" | "loading"
>;

export function SkeletonBlock({ view }: { view: NavView }) {
	return view === "pv" ? (
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
	);
}

export function FilesSkeletonBody({
	view,
	loading,
}: {
	view: NavView;
	loading: string;
}) {
	return (
		<>
			<p className="sr-only" role="status">
				{loading}
			</p>
			<div className="files-skeleton page-skeleton" aria-hidden="true">
				<span className="sk sk-crumb" />
				<span className="sk sk-title" />
				<span className="sk sk-lede" />
				<SkeletonBlock view={view} />
			</div>
		</>
	);
}

export function FilesSkeleton({ t }: { t: FilesSkeletonCopy }) {
	const query = useSearchParams();
	const view = navView(parseView(query?.get("view") ?? undefined));
	return (
		<main id="content" className="page files-page" aria-busy="true">
			<FilesViews view={view} t={t} />
			<FilesSkeletonBody view={view} loading={t.loading} />
		</main>
	);
}
