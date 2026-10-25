import { FilesLink } from "./FilesLink";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({
	items,
	label,
}: {
	items: Crumb[];
	label: string;
}) {
	return (
		<nav className="crumbs" aria-label={label}>
			<ol>
				{items.map((item, at) => {
					const last = at === items.length - 1;
					return (
						<li key={item.label}>
							{item.href && !last ? (
								<FilesLink href={item.href}>{item.label}</FilesLink>
							) : (
								<span aria-current={last ? "page" : undefined}>
									{item.label}
								</span>
							)}
							{last ? null : <span aria-hidden="true">›</span>}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
