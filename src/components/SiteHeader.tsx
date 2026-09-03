"use client";

import { signOutAction } from "@/auth-actions";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { useI18n } from "@/i18n/provider";

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
	return (
		<header className="topbar">
			<div className="topbar-brand">
				<a className="wordmark" href={signedIn ? "/home" : "/"}>
					{m.brand}
				</a>
				{signedIn ? (
					<a className="topbar-cards" href="/me">
						{m.nav.cards}
					</a>
				) : null}
			</div>
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
