"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import type { CardKind } from "@/server/card-kinds";

export function CardNav({
	current,
	base = "/me",
}: {
	current?: string;
	base?: string;
}) {
	const { m } = useI18n();
	const items: { kind: CardKind; label: string }[] = [
		{ kind: "b30", label: m.nav.b30 },
		{ kind: "hisb30", label: m.nav.hisb30 },
		{ kind: "info", label: m.nav.info },
		{ kind: "x30", label: m.nav.x30 },
		{ kind: "fc30", label: m.nav.fc30 },
	];
	const visible = base.startsWith("/p/")
		? items.filter(
				(i) => i.kind === "b30" || i.kind === "hisb30" || i.kind === "info",
			)
		: items;
	return (
		<nav aria-label={m.nav.cards}>
			<ul className="card-nav">
				{visible.map((item) => {
					const href = `${base}/${item.kind}`;
					const active = current === item.kind;
					return (
						<li key={item.kind}>
							<Link href={href} aria-current={active ? "page" : undefined}>
								{item.label}
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
