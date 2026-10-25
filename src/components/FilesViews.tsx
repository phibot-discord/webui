import { FilesLink, ViewPending } from "@/components/FilesLink";
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
						<FilesLink
							href={viewHref(id)}
							aria-current={id === view ? "page" : undefined}
						>
							{t.views[id]}
							<ViewPending view={id} className="files-views-pending" />
						</FilesLink>
					</li>
				))}
			</ul>
		</nav>
	);
}
