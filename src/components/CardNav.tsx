"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { LinkPending } from "@/components/LinkPending";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";
import { revealInRow, rowFade } from "@/lib/scroll";
import { CARD_KINDS, CARD_PAGES, isPublicKind } from "@/server/card-kinds";

let followedAt = 0;

export function CardNav({
	current,
	base = "/me",
	publicOnly = false,
}: {
	current?: string;
	base?: string;
	publicOnly?: boolean;
}) {
	const { m } = useI18n();
	const list = useRef<HTMLUListElement>(null);
	const items = CARD_KINDS.map((kind) => ({
		kind: kind as string,
		href: `${base}/${kind}`,
		label: m.nav[kind],
	}));
	const visible = publicOnly
		? items.filter((i) => isPublicKind(i.kind))
		: [
				...items,
				...CARD_PAGES.map((page) => ({
					kind: page.id as string,
					href: page.href as string,
					label: m.nav[page.id],
				})),
			];

	// biome-ignore lint/correctness/useExhaustiveDependencies: runs again when the current tab changes, read from the DOM
	useLayoutEffect(() => {
		const ul = list.current;
		const tab = ul?.querySelector<HTMLElement>('[aria-current="page"]');
		if (!ul || !tab) return;
		revealInRow(ul, tab);
		if (followedAt && Date.now() - followedAt < 30_000) {
			followedAt = 0;
			tab.focus({ preventScroll: true });
		}
	}, [current]);

	useEffect(() => {
		const ul = list.current;
		if (!ul) return;
		const update = () => {
			ul.dataset.fade = rowFade(ul.scrollLeft, ul.scrollWidth - ul.clientWidth);
		};
		const onFocus = (e: FocusEvent) => {
			if (e.target instanceof HTMLElement) revealInRow(ul, e.target);
		};
		update();
		ul.addEventListener("scroll", update, { passive: true });
		ul.addEventListener("focusin", onFocus);
		const ro = new ResizeObserver(update);
		ro.observe(ul);
		return () => {
			ul.removeEventListener("scroll", update);
			ul.removeEventListener("focusin", onFocus);
			ro.disconnect();
		};
	}, []);

	return (
		<nav aria-label={m.nav.cards}>
			<ul className="card-nav row-fade" ref={list}>
				{visible.map((item) => {
					const active = current === item.kind;
					return (
						<li key={item.kind}>
							<Link
								href={item.href}
								prefetch={false}
								aria-current={active ? "page" : undefined}
								onClick={(e) => {
									if (
										!active &&
										e.button === 0 &&
										!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
									) {
										followedAt = Date.now();
									}
								}}
							>
								{item.label}
								<LinkPending className="card-nav-pending" />
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
