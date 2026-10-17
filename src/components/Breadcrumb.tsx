import Link from "next/link";

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
								<Link href={item.href} prefetch={false}>
									{item.label}
								</Link>
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
