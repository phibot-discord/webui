import { Figure } from "@/components/Figure";
import { Actions, AgreeNote } from "@/components/landing/Actions";
import { InviteLink } from "@/components/landing/Invite";
import { LevelChip } from "@/components/landing/LevelChip";
import { LandingExplore, LandingLookups } from "@/components/landing/Lookups";
import { Rich } from "@/components/landing/Rich";
import { LandingScoreboard } from "@/components/landing/Scoreboard";
import { getMessages } from "@/i18n/server";
import { fill } from "@/phi/lib/card-i18n";

export async function LandingView({
	next,
	signedIn = false,
}: {
	next: string;
	signedIn?: boolean;
}) {
	const { m } = await getMessages();
	const t = m.home;
	const f = m.figures;
	const label = (n: number) => fill(f.label, { n });
	return (
		<main id="content" className="landing">
			<section className="hero" aria-labelledby="hero-title">
				<div className="hero-copy">
					<p className="hero-eyebrow caps-label">{t.eyebrow}</p>
					<h1 id="hero-title" className="hero-title">
						<Rich text={t.title} />
					</h1>
					<p className="hero-lede">
						<Rich text={signedIn ? t.ledeSignedIn : t.lede} />
					</p>
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
				<Figure
					name="b30"
					className="hero-fig fig-enter"
					label={label(1)}
					caption={f.b30.caption}
					parts={f.b30.parts}
				/>
			</section>

			<LandingScoreboard />

			<LandingLookups signedIn={signedIn} />

			<LandingExplore
				signedIn={signedIn}
				figure={
					<Figure
						name="chart"
						className="explore-fig"
						label={label(2)}
						caption={f.chart.caption}
						parts={f.chart.parts}
					/>
				}
			/>

			<section
				className="closing landing-section lcard-grid"
				aria-labelledby="closing-title"
			>
				<Figure
					name="b30"
					view="assembled"
					className="closing-fig"
					label={label(3)}
					caption={f.b30.assembled}
				/>
				<div className="closing-copy">
					<LevelChip rank="AT" level="16.8" />
					<h2 id="closing-title" className="closing-title">
						{t.closingTitle}
					</h2>
					<p className="closing-caption">{t.closingCaption}</p>
					<div className="closing-actions">
						<Actions next={next} signedIn={signedIn} secondary="invite" />
					</div>
				</div>
			</section>
		</main>
	);
}
