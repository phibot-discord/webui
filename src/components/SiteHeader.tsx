"use client";

import { usePathname } from "next/navigation";
import {
	type KeyboardEvent,
	type PointerEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { signOutAction } from "@/auth-actions";
import { CaretDown, List, UserCircle, X } from "@/components/icons";
import Link from "@/components/LocaleLink";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import {
	type SearchHandle,
	SearchPalette,
	SearchTrigger,
} from "@/components/SearchPalette";
import { focusMain } from "@/components/SkipLink";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useToolDismiss } from "@/components/Tool";
import {
	markSessionChanged,
	useHeaderSession,
} from "@/components/useHeaderSession";
import { useNavGroups } from "@/components/useNavGroups";
import { useI18n } from "@/i18n/provider";
import { stripLocale } from "@/lib/locale-path";
import {
	currentGroup,
	isHere,
	type NavGroup,
	type NavGroupId,
} from "@/lib/nav";
import { forgetRecapNote } from "@/lib/recap-note";
import { isRedirectSignal } from "@/lib/redirect-signal";
import { REVIEW_YEAR } from "@/lib/review-window";
import { fill } from "@/phi/lib/card-i18n";

function leaveAccount() {
	markSessionChanged();
	forgetRecapNote();
}

async function signOutHere() {
	try {
		await signOutAction();
	} catch (err) {
		if (!isRedirectSignal(err)) throw err;
	}
}

const CLOSE_MS = 180;
const WIDE = "(min-width: 64em) and (hover: hover)";

function NavGroupMenu({
	group,
	open,
	current,
	path,
	onOpen,
	onClose,
	onPick,
}: {
	group: NavGroup;
	open: boolean;
	current: boolean;
	path: string;
	onOpen: (id: NavGroupId) => void;
	onClose: () => void;
	onPick: (href: string) => void;
}) {
	const { m } = useI18n();
	const panelId = useId();
	const box = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const timer = useRef<number | undefined>(undefined);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	const hoverable = (e: PointerEvent) =>
		e.pointerType === "mouse" && window.matchMedia(WIDE).matches;

	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Escape" && open) {
			e.preventDefault();
			onClose();
			trigger.current?.focus();
			return;
		}
		if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
		const links = [
			...(box.current?.querySelectorAll<HTMLAnchorElement>(".nav-panel a") ??
				[]),
		];
		if (!links.length) return;
		e.preventDefault();
		if (!open) {
			onOpen(group.id);
			requestAnimationFrame(() =>
				box.current?.querySelector<HTMLAnchorElement>(".nav-panel a")?.focus(),
			);
			return;
		}
		const at = links.indexOf(document.activeElement as HTMLAnchorElement);
		const next =
			e.key === "ArrowDown"
				? (at + 1) % links.length
				: (at - 1 + links.length) % links.length;
		links[next]?.focus();
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: hover opens the panel; the button and links handle keys and clicks
		<div
			ref={box}
			className="nav-group"
			data-open={open || undefined}
			onPointerEnter={(e) => {
				if (!hoverable(e)) return;
				window.clearTimeout(timer.current);
				onOpen(group.id);
			}}
			onPointerLeave={(e) => {
				if (!hoverable(e)) return;
				window.clearTimeout(timer.current);
				timer.current = window.setTimeout(() => onClose(), CLOSE_MS);
			}}
			onBlur={(e) => {
				if (open && !box.current?.contains(e.relatedTarget as Node | null)) {
					onClose();
				}
			}}
			onKeyDown={onKeyDown}
		>
			<button
				ref={trigger}
				type="button"
				className="topbar-link nav-trigger"
				aria-expanded={open}
				aria-controls={panelId}
				data-current={current || undefined}
				onClick={() => (open ? onClose() : onOpen(group.id))}
			>
				{m.nav.groups[group.id]}
				<CaretDown className="nav-caret" size={12} weight="bold" aria-hidden />
			</button>
			<ul className="nav-panel" id={panelId} hidden={!open}>
				{group.items.map((item) => (
					<li key={item.id}>
						<Link
							href={item.href}
							prefetch={false}
							aria-current={isHere(path, item.match) ? "page" : undefined}
							onClick={() => onPick(item.href)}
						>
							{fill(m.nav[item.id], { year: REVIEW_YEAR })}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}

export function SiteHeader() {
	const { signedIn, name, image } = useHeaderSession();
	const { m } = useI18n();
	const path = usePathname();
	const bare = stripLocale(path);
	const here = currentGroup(bare);
	const groups = useNavGroups();
	const menuId = useId();
	const root = useRef<HTMLElement>(null);
	const toggle = useRef<HTMLButtonElement>(null);
	const leftFrom = useRef<string | null>(null);
	const search = useRef<SearchHandle>(null);
	const openSearch = useCallback(() => search.current?.show(), []);
	const [open, setOpen] = useState(false);
	const [group, setGroup] = useState<NavGroupId | null>(null);
	const [openedOn, setOpenedOn] = useState(path);
	if (openedOn !== path && (open || group)) {
		setOpenedOn(path);
		setOpen(false);
		setGroup(null);
	}

	useEffect(() => {
		if (leftFrom.current === null || leftFrom.current === path) return;
		leftFrom.current = null;
		if (!focusMain()) toggle.current?.focus();
	}, [path]);

	const close = useCallback((why: "outside" | "escape" | "blur") => {
		setOpen(false);
		setGroup(null);
		if (why === "escape") toggle.current?.focus();
	}, []);
	useToolDismiss(open, close, root);

	useEffect(() => {
		if (!group || open) return;
		const onPointer = (e: globalThis.PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) setGroup(null);
		};
		document.addEventListener("pointerdown", onPointer);
		return () => document.removeEventListener("pointerdown", onPointer);
	}, [group, open]);

	const pick = (href: string) => {
		setGroup(null);
		if (!open) return;
		setOpen(false);
		if (href === bare) focusMain();
		else leftFrom.current = path;
	};

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
						setGroup(open ? null : (here ?? (signedIn ? "scores" : "tools")));
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
						{groups.map((g) => (
							<NavGroupMenu
								key={g.id}
								group={g}
								open={group === g.id}
								current={here === g.id}
								path={bare}
								onOpen={(id) => {
									setOpenedOn(path);
									setGroup(id);
								}}
								onClose={() => setGroup((v) => (v === g.id ? null : v))}
								onPick={pick}
							/>
						))}
					</nav>
					<SearchTrigger className="sp-slot-wide" onOpen={openSearch} />
					<div className="topbar-end">
						<LocaleSwitch />
						<ThemeSwitch />
						{signedIn ? (
							<div className="topbar-account">
								<Link
									className="who"
									href="/account"
									prefetch={false}
									aria-label={fill(m.nav.accountOf, {
										name: name || m.signedIn,
									})}
									aria-current={isHere(bare, ["/account"]) ? "page" : undefined}
									onClick={() => pick("/account")}
								>
									{image ? (
										// biome-ignore lint/performance/noImgElement: the sign-in provider's avatar, not a known static asset
										<img
											src={image}
											alt=""
											width={28}
											height={28}
											onError={(e) => {
												e.currentTarget.hidden = true;
											}}
										/>
									) : (
										<UserCircle size={28} weight="duotone" aria-hidden />
									)}
									<span>{name || m.signedIn}</span>
								</Link>
								<form action={signOutHere}>
									<button
										className="btn btn-ghost btn-sm"
										type="submit"
										onClick={leaveAccount}
									>
										{m.signOut}
									</button>
								</form>
							</div>
						) : null}
					</div>
				</div>
				<SearchTrigger className="sp-slot-bar" onOpen={openSearch} />
				<SearchPalette ref={search} signedIn={signedIn} />
			</div>
		</header>
	);
}
