"use client";

import Link from "next/link";
import { signInDiscord } from "@/auth-actions";
import { DitherBall } from "@/components/landing/Dither";
import { HeroStage } from "@/components/landing/HeroStage";
import { InviteLink } from "@/components/landing/Invite";
import { LevelChip } from "@/components/landing/LevelChip";
import { LandingLookups } from "@/components/landing/Lookups";
import { Rich } from "@/components/landing/Rich";
import { LandingScoreboard } from "@/components/landing/Scoreboard";
import { SignInButton, SignInStatus } from "@/components/landing/SignIn";
import { useI18n } from "@/i18n/provider";

function Actions({
	next,
	signedIn,
	secondary,
}: {
	next: string;
	signedIn: boolean;
	secondary: "taptap" | "invite";
}) {
	const { m } = useI18n();
	if (signedIn) {
		return (
			<>
				<Link className="pill pill-primary" href="/me/b30">
					{m.home.openDesk}
				</Link>
				<InviteLink className="pill pill-secondary" />
			</>
		);
	}
	return (
		<>
			<form action={signInDiscord}>
				<input type="hidden" name="next" value={next} />
				<SignInButton className="pill pill-primary" />
				<SignInStatus />
			</form>
			{secondary === "taptap" ? (
				<Link
					className="pill pill-secondary"
					href={`/login/taptap?${new URLSearchParams({ next })}`}
				>
					{m.signInTaptap}
				</Link>
			) : (
				<InviteLink className="pill pill-secondary" />
			)}
		</>
	);
}

function AgreeNote() {
	const { m } = useI18n();
	const a = m.legal.agree;
	return (
		<p className="agree-note">
			{a.before}
			<Link href="/tos">{a.terms}</Link>
			{a.and}
			<Link href="/privacy">{a.privacy}</Link>
			{a.after}
		</p>
	);
}

export function LandingView({
	next,
	signedIn = false,
}: {
	next: string;
	signedIn?: boolean;
}) {
	const { m } = useI18n();
	const t = m.home;
	return (
		<main id="content" className="landing">
			<section className="hero" aria-labelledby="hero-title">
				<div className="hero-copy">
					<p className="hero-eyebrow">
						<span className="hero-eyebrow-phi" aria-hidden="true">
							φ
						</span>
						{t.eyebrow}
					</p>
					<h1 id="hero-title" className="hero-title">
						<Rich text={t.title} />
					</h1>
					<div className="hero-actions">
						<Actions next={next} signedIn={signedIn} secondary="taptap" />
					</div>
					{signedIn ? null : (
						<div className="hero-more">
							<InviteLink className="hero-invite" />
							<AgreeNote />
						</div>
					)}
				</div>
				<HeroStage />
			</section>

			<p className="landing-lead">
				<Rich text={signedIn ? t.ledeSignedIn : t.lede} />
			</p>

			<LandingScoreboard />

			<LandingLookups signedIn={signedIn} />

			<section className="closing" aria-labelledby="closing-title">
				<LevelChip rank="AT" level="16.8" />
				<h2 id="closing-title" className="closing-title">
					{t.closingTitle}
				</h2>
				<p className="closing-caption">{t.closingCaption}</p>
				<div className="closing-actions">
					<Actions next={next} signedIn={signedIn} secondary="invite" />
				</div>
				<div className="closing-well" aria-hidden="true">
					<DitherBall size={160} className="closing-ball" />
				</div>
			</section>
		</main>
	);
}
