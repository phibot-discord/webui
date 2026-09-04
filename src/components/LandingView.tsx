"use client";

import { signInDiscord } from "@/auth-actions";
import { PlayStage } from "@/components/landing/PlayStage";
import { LandingScoreboard } from "@/components/landing/Scoreboard";
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
			<section className="hero">
				<div className="hero-copy">
					<p className="hero-kicker">{m.home.kicker}</p>
					<h1 className="hero-title">{m.home.title}</h1>
					<p className="hero-lede">{m.home.lede}</p>
					<div className="hero-actions">
						{signedIn ? (
							<a className="btn btn-primary btn-skew" href="/me">
								<span>{m.home.openDesk}</span>
							</a>
						) : (
							<form action={signInDiscord}>
								<input type="hidden" name="next" value={next} />
								<button className="btn btn-primary btn-skew" type="submit">
									<span>{m.signIn}</span>
								</button>
							</form>
						)}
						<a
							className="btn btn-ghost btn-skew"
							href={BOT_INVITE}
							rel="noopener noreferrer"
							target="_blank"
						>
							<span>{m.invite}</span>
						</a>
					</div>
				</div>
				<PlayStage />
			</section>

			<LandingScoreboard
				title={m.home.boardTitle}
				lede={m.home.boardLede}
				linkLabel={m.home.showFull}
			/>

			<section className="lookups" aria-labelledby="lookups-title">
				<h2 id="lookups-title">{m.home.lookupsTitle}</h2>
				<ul className="lookup-grid">
					{m.home.lookups.map((item, i) => (
						<li key={item.name} style={{ ["--i" as string]: i }}>
							<span className="lookup-name">{item.name}</span>
							<p className="lookup-blurb">{item.blurb}</p>
						</li>
					))}
				</ul>
			</section>

			<footer className="landing-foot">
				<p>{m.home.footer}</p>
			</footer>
		</main>
	);
}
