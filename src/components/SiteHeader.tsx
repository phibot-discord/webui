"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/auth-actions";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { focusMain } from "@/components/SkipLink";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useToolDismiss } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { CARD_PAGES } from "@/server/card-kinds";
import type { ThemeChoice } from "@/theme/config";

function here(path: string, match: readonly string[]) {
	return match.some((href) => path === href || path.startsWith(`${href}/`));
}

export function SiteHeader({
	signedIn,
	name,
	image,
	theme,
}: {
	signedIn: boolean;
	name?: string | null;
	image?: string | null;
	theme: ThemeChoice;
}) {
	const { m } = useI18n();
	const path = usePathname();
	const menuId = useId();
	const root = useRef<HTMLElement>(null);
	const toggle = useRef<HTMLButtonElement>(null);
	const leftFrom = useRef<string | null>(null);
	const [open, setOpen] = useState(false);
	const [openedOn, setOpenedOn] = useState(path);
	if (open && openedOn !== path) {
		setOpen(false);
	}

	useEffect(() => {
		if (leftFrom.current === null || leftFrom.current === path) return;
		leftFrom.current = null;
		if (!focusMain()) toggle.current?.focus();
	}, [path]);

	const close = useCallback((why: "outside" | "escape" | "blur") => {
		setOpen(false);
		if (why === "escape") toggle.current?.focus();
	}, []);
	useToolDismiss(open, close, root);

	const links = [
		{ href: "/songs", match: ["/songs"], label: m.nav.songs },
		{ href: "/score", match: ["/score"], label: m.nav.score },
		{ href: "/phira", match: ["/phira", "/phira-mp"], label: m.nav.phira },
		{ href: "/files", match: ["/files"], label: m.nav.files },
		...(signedIn
			? [
					{
						href: "/me/b30",
						match: ["/me", ...CARD_PAGES.map((page) => page.href)],
						label: m.nav.cards,
						heavy: true,
					},
					{ href: "/account", match: ["/account"], label: m.nav.account },
				]
			: []),
	];

	return (
		<header className="topbar" ref={root} data-open={open || undefined}>
			{open ? (
				<div
					className="topbar-scrim"
					aria-hidden="true"
					onClick={() => setOpen(false)}
				/>
			) : null}
			<div className="topbar-inner">
				<Link className="wordmark" href={signedIn ? "/home" : "/"}>
					{m.brand}
				</Link>
				<button
					ref={toggle}
					type="button"
					className="btn btn-quiet topbar-toggle"
					aria-expanded={open}
					aria-controls={menuId}
					onClick={() => {
						setOpenedOn(path);
						setOpen((v) => !v);
					}}
				>
					{open ? (
						<X size={20} weight="bold" aria-hidden />
					) : (
						<List size={20} weight="bold" aria-hidden />
					)}
					{m.nav.toggle}
				</button>
				<div id={menuId} className="topbar-menu" data-open={open || undefined}>
					<nav className="topbar-links" aria-label={m.nav.menu}>
						{links.map((link) => (
							<Link
								key={link.href}
								className="topbar-link"
								href={link.href}
								prefetch={"heavy" in link ? false : undefined}
								aria-current={here(path, link.match) ? "page" : undefined}
								onClick={() => {
									if (!open) return;
									setOpen(false);
									if (link.href === path) focusMain();
									else leftFrom.current = path;
								}}
							>
								{link.label}
							</Link>
						))}
					</nav>
					<div className="topbar-end">
						<LocaleSwitch />
						<ThemeSwitch initial={theme} />
						{signedIn ? (
							<div className="topbar-account">
								<div className="who">
									{image ? (
										<img
											src={image}
											alt=""
											width={28}
											height={28}
											onError={(e) => {
												e.currentTarget.hidden = true;
											}}
										/>
									) : null}
									<span>{name || m.signedIn}</span>
								</div>
								<form action={signOutAction}>
									<button className="btn btn-ghost btn-sm" type="submit">
										{m.signOut}
									</button>
								</form>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</header>
	);
}
