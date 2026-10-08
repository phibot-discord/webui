"use client";

import { linkDiscord } from "@/auth-actions";
import { LinkDiscordButton } from "@/components/LinkDiscordButton";
import { SignInStatus } from "@/components/landing/SignIn";
import { useI18n } from "@/i18n/provider";

export type AccountLinkError = "discord_taken" | "link_expired" | "link_failed";

export function AccountView({
	viaTap,
	tapLinked,
	linkError,
	linkedOk,
}: {
	viaTap: boolean;
	tapLinked: boolean;
	linkError?: AccountLinkError;
	linkedOk: boolean;
}) {
	const { m } = useI18n();
	const t = m.account;
	const notice = linkError ? t[linkError] : linkedOk ? t.linkedOk : undefined;
	return (
		<section className="bind-panel account-panel">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			{notice ? (
				<p
					className={linkError ? "bind-error" : "account-notice"}
					role={linkError ? "alert" : "status"}
				>
					{notice}
				</p>
			) : null}
			<ul className="account-methods">
				<li className="account-method">
					<div className="account-method-head">
						<h2>{t.taptap}</h2>
						<span
							className={`account-state${viaTap || tapLinked ? " is-on" : ""}`}
						>
							{viaTap ? t.thisLogin : tapLinked ? t.linked : t.notLinked}
						</span>
					</div>
					<p>{viaTap ? t.tapHere : tapLinked ? t.tapLinked : t.tapHint}</p>
				</li>
				<li className="account-method">
					<div className="account-method-head">
						<h2>{t.discord}</h2>
						<span className={`account-state${viaTap ? "" : " is-on"}`}>
							{viaTap ? t.notLinked : t.thisLogin}
						</span>
					</div>
					<p>{viaTap ? t.linkDiscordLede : t.discordHere}</p>
					{viaTap ? (
						<form action={linkDiscord}>
							<LinkDiscordButton />
							<SignInStatus />
						</form>
					) : null}
				</li>
			</ul>
		</section>
	);
}
