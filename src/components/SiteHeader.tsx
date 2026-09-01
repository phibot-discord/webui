import { signOut } from "@/auth";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import type { Messages } from "@/i18n/messages";

export function SiteHeader({
	signedIn,
	name,
	image,
	m,
}: {
	signedIn: boolean;
	name?: string | null;
	image?: string | null;
	m: Messages;
}) {
	return (
		<header className="topbar">
			<a className="wordmark" href={signedIn ? "/me" : "/"}>
				{m.brand}
			</a>
			<div className="topbar-end">
				<LocaleSwitch />
				<ThemeSwitch />
				{signedIn ? (
					<>
						<div className="who">
							{image ? <img src={image} alt="" width={28} height={28} /> : null}
							<span>{name || m.signedIn}</span>
						</div>
						<form
							action={async () => {
								"use server";
								await signOut({ redirectTo: "/" });
							}}
						>
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
