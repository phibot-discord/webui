import { Drawing } from "@/components/Drawing";
import { Figure } from "@/components/Figure";
import { Actions, AgreeNote } from "@/components/landing/Actions";
import { InviteLink } from "@/components/landing/Invite";
import { LevelChip } from "@/components/landing/LevelChip";
import { LandingExplore, LandingLookups } from "@/components/landing/Lookups";
import { Rich } from "@/components/landing/Rich";
import { LandingScoreboard } from "@/components/landing/Scoreboard";
import { SessionSwap } from "@/components/landing/SessionSwap";
import { LandingStage } from "@/components/landing/Stage";
import { getMessages } from "@/i18n/server";
import { fill } from "@/phi/lib/card-i18n";

export async function LandingView({
	next,
	live = false,
}: {
	next: string;
	live?: boolean;
}) {
	const { m } = await getMessages();
	const t = m.home;
	const f = m.figures;
	const label = (n: number) => fill(f.label, { n });
	return (
		<main id="content" className="landing">
			<LandingStage />
			<section className="hero" aria-labelledby="hero-title">
				<div className="hero-copy">
					<p className="hero-eyebrow caps-label">{t.eyebrow}</p>
					<h1 id="hero-title" className="hero-title">
						<Rich text={t.title} />
					</h1>
					<SessionSwap
						live={live}
						className="hero-lede-swap"
						signedOut={
							<p className="hero-lede">
								<Rich text={t.lede} />
							</p>
						}
						signedIn={
							<p className="hero-lede">
								<Rich text={t.ledeSignedIn} />
							</p>
						}
					/>
					<SessionSwap
						live={live}
						className="hero-actions-swap"
						signedOut={
							<>
								<div className="hero-actions">
									<Actions next={next} signedIn={false} secondary="taptap" />
								</div>
								<div className="hero-more">
									<InviteLink className="hero-invite" />
									<InviteLink className="hero-invite" kind="user" />
									<AgreeNote />
								</div>
							</>
						}
						signedIn={
							<div className="hero-actions">
								<Actions next={next} signedIn secondary="taptap" />
							</div>
						}
					/>
				</div>
				<div className="hero-fig fig-enter" data-stage-slot="hero">
					<Drawing name="b30" view="front" />
				</div>
			</section>

			<div className="landing-section breakdown">
				<Figure
					name="b30"
					className="break-fig"
					slot="break"
					label={label(1)}
					caption={f.b30.caption}
					parts={f.b30.parts}
				/>
			</div>

			<LandingScoreboard />

			<LandingLookups live={live} />

			<LandingExplore
				live={live}
				figure={
					<Figure
						name="chart"
						className="explore-fig"
						slot="explore"
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
					slot="closing"
					label={label(3)}
					caption={f.b30.assembled}
				/>
				<div className="closing-copy">
					<LevelChip rank="AT" level="16.8" />
					<h2 id="closing-title" className="closing-title">
						{t.closingTitle}
					</h2>
					<p className="closing-caption">{t.closingCaption}</p>
					<SessionSwap
						live={live}
						className="closing-actions-swap"
						signedOut={
							<div className="closing-actions">
								<Actions next={next} signedIn={false} secondary="invite" />
							</div>
						}
						signedIn={
							<div className="closing-actions">
								<Actions next={next} signedIn secondary="invite" />
							</div>
						}
					/>
				</div>
			</section>
		</main>
	);
}
