import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/auth";
import { EarGame } from "@/components/EarGame";
import { GuessGame } from "@/components/GuessGame";
import Link from "@/components/LocaleLink";
import { formatDay } from "@/i18n/datetime";
import { getMessages, localeHref, signInLink } from "@/i18n/server";
import { dayKey, practiceId } from "@/lib/guess";
import { guessHref, guessView } from "@/lib/guess-view";
import { fill } from "@/phi/lib/card-i18n";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("guess", { path: "/guess" });
}

export default async function GuessPage({
	searchParams,
}: {
	searchParams: Promise<{ p?: string | string[]; ear?: string | string[] }>;
}) {
	const today = dayKey();
	const view = guessView(await searchParams, today);
	if ("redirect" in view) {
		redirect(
			await localeHref(
				`/guess?${view.redirect}=${practiceId((n) => randomBytes(n))}`,
			),
		);
	}
	const [{ m, locale }, viewer] = await Promise.all([
		getMessages(),
		sessionUserId(),
	]);
	const t = m.guess;
	const { game, puzzle, daily, day, live } = view;
	const byEar = game === "ear";
	const label = daily
		? fill(byEar ? t.earDailyOf : t.dailyOf, { date: formatDay(day, locale) })
		: byEar
			? t.earLabel
			: t.practiceLabel;
	const boardTitle =
		day === today
			? t.boardTitle
			: fill(t.boardTitleDay, { date: formatDay(day || today, locale) });
	const signInHref = await signInLink(
		byEar ? guessHref("ear", true) : daily ? "/guess" : `/guess?p=${puzzle}`,
	);
	return (
		<main id="content" className="page guess-page">
			<h1>{t.title}</h1>
			<p className="lede">{byEar ? t.earLede : t.lede}</p>
			<nav className="files-views guess-games" aria-label={t.gameLabel}>
				<ul>
					<li>
						<Link
							href={guessHref("jacket", daily)}
							prefetch={false}
							aria-current={byEar ? undefined : "true"}
						>
							{t.picture}
						</Link>
					</li>
					<li>
						<Link
							href={guessHref("ear", daily)}
							prefetch={false}
							aria-current={byEar ? "true" : undefined}
						>
							{t.ear}
						</Link>
					</li>
				</ul>
			</nav>
			<nav className="files-views guess-modes" aria-label={t.modeLabel}>
				<ul>
					<li>
						<Link
							href={guessHref(game, true)}
							prefetch={false}
							aria-current={live ? "page" : undefined}
						>
							{t.daily}
						</Link>
					</li>
					<li>
						<Link
							href={guessHref(game, false)}
							prefetch={false}
							aria-current={daily ? undefined : "page"}
						>
							{t.practice}
						</Link>
					</li>
				</ul>
			</nav>
			{byEar ? (
				<EarGame
					key={puzzle}
					puzzle={puzzle}
					daily={daily}
					live={live}
					label={label}
					boardTitle={boardTitle}
					signedIn={Boolean(viewer)}
					signInHref={signInHref}
				/>
			) : (
				<GuessGame
					key={puzzle}
					puzzle={puzzle}
					daily={daily}
					live={live}
					label={label}
					boardTitle={boardTitle}
					signedIn={Boolean(viewer)}
					signInHref={signInHref}
				/>
			)}
			<section className="song-section guess-how" aria-labelledby="guess-how">
				<h2 id="guess-how">{t.howTitle}</h2>
				<ul>
					{(byEar ? t.earHow : t.how).map((line) => (
						<li key={line}>{line}</li>
					))}
				</ul>
			</section>
		</main>
	);
}
