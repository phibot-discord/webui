"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { signInDiscord } from "@/auth-actions";
import { LandingLookups } from "@/components/landing/Lookups";
import { PlayStage } from "@/components/landing/PlayStage";
import { LandingScoreboard } from "@/components/landing/Scoreboard";
import { SignInButton, SignInStatus } from "@/components/landing/SignIn";
import { useI18n } from "@/i18n/provider";

const BOT_INVITE =
	"https://discord.com/oauth2/authorize?client_id=1543272274952724590&permissions=8584986789675007&scope=bot+applications.commands";

export function LandingView({
	next,
	signedIn = false,
}: {
	next: string;
	signedIn?: boolean;
}) {
	const { m } = useI18n();
	return (
		<main id="content" className="landing">
			<section className="hero" aria-labelledby="hero-title">
				<div className="hero-copy">
					<p className="hero-kicker">{m.home.kicker}</p>
					<h1 id="hero-title" className="hero-title">
						{m.home.title}
					</h1>
					<p className="hero-lede">
						{signedIn ? m.home.ledeSignedIn : m.home.lede}
					</p>
					<div className="hero-actions">
						{signedIn ? (
							<Link className="btn btn-primary btn-skew" href="/me/b30">
								<span>{m.home.openDesk}</span>
							</Link>
						) : (
							<form action={signInDiscord}>
								<input type="hidden" name="next" value={next} />
								<SignInButton />
								<SignInStatus />
							</form>
						)}
						<a
							className="btn btn-ghost btn-skew"
							href={BOT_INVITE}
							rel="noopener noreferrer"
							target="_blank"
						>
							<span>
								{m.invite}
								<ArrowUpRight size={16} aria-hidden="true" />
								<span className="sr-only"> ({m.home.newTab})</span>
							</span>
						</a>
					</div>
				</div>
				<PlayStage />
			</section>

			<LandingScoreboard />

			<LandingLookups signedIn={signedIn} />

			<div className="landing-foot">
				<p>{m.home.footer}</p>
			</div>
		</main>
	);
}
