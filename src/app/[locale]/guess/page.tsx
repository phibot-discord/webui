import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/auth";
import { EarGame } from "@/components/EarGame";
import { GuessGame } from "@/components/GuessGame";
import Link from "@/components/LocaleLink";
import { formatDay } from "@/i18n/datetime";
import { getMessages, localeHref, signInLink } from "@/i18n/server";
import { dailyId, dayKey, practiceId, puzzleKind } from "@/lib/guess";
import { EAR_PARAM } from "@/lib/guess-ear";
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
	const query = await searchParams;
	const raw = query.p;
	const asked = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
	if (asked === "new") {
		redirect(await localeHref(`/guess?p=${practiceId((n) => randomBytes(n))}`));
	}
	const rawEar = query[EAR_PARAM];
	const ear = (Array.isArray(rawEar) ? rawEar[0] : rawEar)?.trim() ?? "";
	if (ear === "new") {
		redirect(
			await localeHref(
				`/guess?${EAR_PARAM}=${practiceId((n) => randomBytes(n))}`,
			),
		);
	}
	const [{ m, locale }, viewer] = await Promise.all([
		getMessages(),
		sessionUserId(),
	]);
	const t = m.guess;
	const today = dayKey();
	const byEar = ear !== "" && puzzleKind(ear, today) === "practice";
	const kind = asked ? puzzleKind(asked, today) : undefined;
	const puzzle = kind ? asked : dailyId(today);
	const daily = !kind || kind === "daily";
	const day = daily ? puzzle.slice(2) : "";
	const label = daily
		? fill(t.dailyOf, { date: formatDay(day, locale) })
		: t.practiceLabel;
	return (
		<main id="content" className="page guess-page">
			<h1>{t.title}</h1>
			<p className="lede">{byEar ? t.earLede : t.lede}</p>
			<nav className="files-views guess-modes" aria-label={t.modeLabel}>
				<ul>
					<li>
						<Link
							href="/guess"
							prefetch={false}
							aria-current={
								!byEar && daily && day === today ? "page" : undefined
							}
						>
							{t.daily}
						</Link>
					</li>
					<li>
						<Link
							href="/guess?p=new"
							prefetch={false}
							aria-current={!byEar && !daily ? "page" : undefined}
						>
							{t.practice}
						</Link>
					</li>
					<li>
						<Link
							href={`/guess?${EAR_PARAM}=new`}
							prefetch={false}
							aria-current={byEar ? "page" : undefined}
						>
							{t.ear}
						</Link>
					</li>
				</ul>
			</nav>
			{byEar ? (
				<EarGame key={ear} puzzle={ear} />
			) : (
				<>
					<GuessGame
						key={puzzle}
						puzzle={puzzle}
						daily={daily}
						live={daily && day === today}
						label={label}
						boardTitle={
							day === today
								? t.boardTitle
								: fill(t.boardTitleDay, {
										date: formatDay(day || today, locale),
									})
						}
						signedIn={Boolean(viewer)}
						signInHref={
							await signInLink(daily ? "/guess" : `/guess?p=${puzzle}`)
						}
					/>
					<section
						className="song-section guess-how"
						aria-labelledby="guess-how"
					>
						<h2 id="guess-how">{t.howTitle}</h2>
						<ul>
							{t.how.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					</section>
				</>
			)}
		</main>
	);
}
