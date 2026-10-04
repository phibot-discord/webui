"use client";

import { usePathname } from "next/navigation";
import { signOutAction } from "@/auth-actions";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useI18n } from "@/i18n/provider";

function here(path: string, href: string) {
	return path === href || path.startsWith(`${href}/`);
}

export function SiteHeader({
	signedIn,
	name,
	image,
}: {
	signedIn: boolean;
	name?: string | null;
	image?: string | null;
}) {
	const { m } = useI18n();
	const path = usePathname();
	return (
		<header className="topbar">
			<div className="topbar-brand">
				<a className="wordmark" href={signedIn ? "/home" : "/"}>
					{m.brand}
				</a>
			</div>
			<nav className="topbar-links" aria-label={m.nav.menu}>
				<a
					className="topbar-cards"
					href="/tags"
					aria-current={here(path, "/tags") ? "page" : undefined}
				>
					{m.nav.tags}
				</a>
				<a
					className="topbar-cards"
					href="/score"
					aria-current={here(path, "/score") ? "page" : undefined}
				>
					{m.nav.score}
				</a>
				<a
					className="topbar-cards"
					href="/phira"
					aria-current={here(path, "/phira") ? "page" : undefined}
				>
					{m.nav.phira}
				</a>
				<a
					className="topbar-cards"
					href="/files"
					aria-current={here(path, "/files") ? "page" : undefined}
				>
					{m.nav.files}
				</a>
				{signedIn ? (
					<a
						className="topbar-cards"
						href="/me"
						aria-current={here(path, "/me") ? "page" : undefined}
					>
						{m.nav.cards}
					</a>
				) : null}
			</nav>
			<div className="topbar-end">
				<LocaleSwitch />
				<ThemeSwitch />
				{signedIn ? (
					<>
						<div className="who">
							{image ? <img src={image} alt="" width={28} height={28} /> : null}
							<span>{name || m.signedIn}</span>
						</div>
						<form action={signOutAction}>
							<button className="btn btn-ghost" type="submit">
								{m.signOut}
							</button>
						</form>
					</>
				) : null}
			</div>
		</header>
	);
}
