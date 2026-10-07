"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useI18n } from "@/i18n/provider";
import type { CardKind } from "@/server/card-kinds";

/** A small bar under a tab while its page loads (prefetch is off) */
function Pending() {
	const { pending } = useLinkStatus();
	return pending ? (
		<span className="card-nav-pending" aria-hidden="true" />
	) : null;
}

/** Room kept clear of the strip's edge fade (2rem in desk.css) */
const FADE = 32;

/** Scrolls the strip (phones) so a tab sits clear of the edge fades */
function reveal(ul: HTMLElement, tab: HTMLElement) {
	if (ul.scrollWidth <= ul.clientWidth) return;
	const box = ul.getBoundingClientRect();
	const r = tab.getBoundingClientRect();
	if (r.right > box.right - FADE) ul.scrollLeft += r.right - box.right + FADE;
	else if (r.left < box.left + FADE) ul.scrollLeft -= box.left + FADE - r.left;
}

/**
 * When a tab was followed. The page under the tabs is replaced, focus with
 * it, so the next tab strip puts focus back on its current tab
 */
let followedAt = 0;

export function CardNav({
	current,
	base = "/me",
}: {
	current?: string;
	base?: string;
}) {
	const { m } = useI18n();
	const list = useRef<HTMLUListElement>(null);
	const items: { kind: CardKind; label: string }[] = [
		{ kind: "b30", label: m.nav.b30 },
		{ kind: "hisb30", label: m.nav.hisb30 },
		{ kind: "info", label: m.nav.info },
		{ kind: "x30", label: m.nav.x30 },
		{ kind: "fc30", label: m.nav.fc30 },
		{ kind: "song", label: m.nav.song },
	];
	const visible = base.startsWith("/p/")
		? items.filter(
				(i) => i.kind === "b30" || i.kind === "hisb30" || i.kind === "info",
			)
		: items;

	// On phones the strip scrolls: bring the current tab out from under the fade
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs again when the current tab changes, read from the DOM
	useLayoutEffect(() => {
		const ul = list.current;
		const tab = ul?.querySelector<HTMLElement>('[aria-current="page"]');
		if (!ul || !tab) return;
		reveal(ul, tab);
		if (followedAt && Date.now() - followedAt < 30_000) {
			followedAt = 0;
			tab.focus({ preventScroll: true });
		}
	}, [current]);

	// Fade only the edges that have more tabs past them
	useEffect(() => {
		const ul = list.current;
		if (!ul) return;
		const update = () => {
			const max = ul.scrollWidth - ul.clientWidth;
			const start = ul.scrollLeft > 1;
			const end = ul.scrollLeft < max - 1;
			ul.dataset.fade =
				start && end ? "both" : start ? "start" : end ? "end" : "none";
		};
		// Chrome leaves a partly visible tab where it is when it takes focus
		const onFocus = (e: FocusEvent) => {
			if (e.target instanceof HTMLElement) reveal(ul, e.target);
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
			<ul className="card-nav" ref={list}>
				{visible.map((item) => {
					const active = current === item.kind;
					return (
						<li key={item.kind}>
							<Link
								href={`${base}/${item.kind}`}
								prefetch={false}
								aria-current={active ? "page" : undefined}
								onClick={(e) => {
									// A plain click that navigates here (not a new tab)
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
								<Pending />
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
