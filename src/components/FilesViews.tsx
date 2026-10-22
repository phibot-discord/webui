import Link from "next/link";
import { LinkPending } from "@/components/LinkPending";
import type { Messages } from "@/i18n/messages";
import { NAV_VIEWS, type NavView, viewHref } from "@/lib/files-view";

export function FilesViews({
	view,
	t,
}: {
	view: NavView;
	t: Pick<Messages["files"], "viewsLabel" | "views">;
}) {
	return (
		<nav className="files-views" aria-label={t.viewsLabel}>
			<ul>
				{NAV_VIEWS.map((id) => (
					<li key={id}>
						<Link
							href={viewHref(id)}
							prefetch={false}
							aria-current={id === view ? "page" : undefined}
						>
							{t.views[id]}
							<LinkPending className="files-views-pending" />
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
