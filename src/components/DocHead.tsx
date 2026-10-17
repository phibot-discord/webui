import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "./Breadcrumb";

export function DocHead({
	crumbs,
	crumbLabel,
	title,
	status = false,
	children,
}: {
	crumbs: Crumb[];
	crumbLabel: string;
	title: ReactNode;
	status?: boolean;
	children: ReactNode;
}) {
	return (
		<>
			<Breadcrumb items={crumbs} label={crumbLabel} />
			<header className="doc-head">
				<h1 id="doc-title">{title}</h1>
				<p className="doc-desc" role={status ? "status" : undefined}>
					{children}
				</p>
			</header>
		</>
	);
}
