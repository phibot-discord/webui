"use client";

import { signInDiscord } from "@/auth-actions";
import { LandingScoreboard } from "@/components/landing/Scoreboard";
import { useI18n } from "@/i18n/provider";

const BOT_INVITE =
	"https://discord.com/oauth2/authorize?client_id=1543272274952724590&permissions=8584986789675007&scope=bot+applications.commands";

export function LandingView({ next }: { next: string }) {
	const { m } = useI18n();
	return (
		<main id="content" className="landing">
			<section className="landing-stage">
				<div className="stage-copy">
					<p className="stage-kicker">{m.home.kicker}</p>
					<h1>{m.home.title}</h1>
					<p className="lede">{m.home.lede}</p>
					<div className="stage-actions">
						<form action={signInDiscord}>
							<input type="hidden" name="next" value={next} />
							<button className="btn btn-primary" type="submit">
								{m.signIn}
							</button>
						</form>
						<a
							className="btn btn-ghost"
							href={BOT_INVITE}
							rel="noopener noreferrer"
							target="_blank"
						>
							{m.invite}
						</a>
					</div>
				</div>
				<LandingScoreboard caption={m.home.scoreboard} rksLabel={m.me.rks} />
			</section>

			<section className="landing-lookups">
				<h2>{m.home.lookupsTitle}</h2>
				<dl className="lookup-defs">
					{m.home.lookups.map((item) => (
						<div key={item.name}>
							<dt>{item.name}</dt>
							<dd>{item.blurb}</dd>
						</div>
					))}
				</dl>
			</section>

			<footer className="landing-foot">
				<p>{m.home.footer}</p>
			</footer>
		</main>
	);
}
