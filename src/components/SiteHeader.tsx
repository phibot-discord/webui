"use client";

import { List, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/auth-actions";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { focusMain } from "@/components/SkipLink";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useI18n } from "@/i18n/provider";
import type { ThemeChoice } from "@/theme/config";

function here(path: string, href: string) {
	return path === href || path.startsWith(`${href}/`);
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
	const scrim = useRef<HTMLDivElement>(null);
	// Path a menu link was followed from; focus moves into the new page
	const leftFrom = useRef<string | null>(null);
	const [open, setOpen] = useState(false);
	const [openedOn, setOpenedOn] = useState(path);
	// Close the narrow-screen menu after navigating
	if (open && openedOn !== path) {
		setOpen(false);
	}

	// The followed link was hidden with the menu, so focus fell to <body>
	useEffect(() => {
		if (leftFrom.current === null || leftFrom.current === path) return;
		leftFrom.current = null;
		if (!focusMain()) toggle.current?.focus();
	}, [path]);

	useEffect(() => {
		if (!open) return;
		const node = root.current;
		const shade = scrim.current;
		const onPointer = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setOpen(false);
		};
		// Closing on click (not pointerdown) keeps the tap from reaching the page
		const onScrim = () => setOpen(false);
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			setOpen(false);
			toggle.current?.focus();
		};
		// Tabbing past the last item would otherwise leave focus hidden under the panel
		const onFocusOut = (e: FocusEvent) => {
			const next = e.relatedTarget as Node | null;
			if (next && !root.current?.contains(next)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		node?.addEventListener("focusout", onFocusOut);
		shade?.addEventListener("click", onScrim);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
			node?.removeEventListener("focusout", onFocusOut);
			shade?.removeEventListener("click", onScrim);
		};
	}, [open]);

	const links = [
		{ href: "/tags", match: "/tags", label: m.nav.tags },
		{ href: "/songs", match: "/songs", label: m.nav.songs },
		{ href: "/score", match: "/score", label: m.nav.score },
		{ href: "/phira", match: "/phira", label: m.nav.phira },
		{ href: "/files", match: "/files", label: m.nav.files },
		...(signedIn
			? [{ href: "/me/b30", match: "/me", label: m.nav.cards, heavy: true }]
			: []),
	];

	return (
		<header className="topbar" ref={root} data-open={open || undefined}>
			{open ? (
				<div ref={scrim} className="topbar-scrim" aria-hidden="true" />
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
										<img src={image} alt="" width={28} height={28} />
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
