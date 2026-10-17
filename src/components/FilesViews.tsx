import Link from "next/link";
import type { Messages } from "@/i18n/messages";
import { NAV_VIEWS, type NavView, viewHref } from "@/lib/files-view";

export function FilesViews({
	view,
	t,
}: {
	view: NavView;
	t: Messages["files"];
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
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
