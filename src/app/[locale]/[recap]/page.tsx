import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { PageSkeleton } from "@/components/PageSkeleton";
import { YearReview } from "@/components/YearReview";
import type { Locale } from "@/i18n/config";
import { getMessages, localeHref, signInHref } from "@/i18n/server";
import { bareId } from "@/lib/chart-catalog";
import {
	REVIEW_YEAR,
	type ReviewPhase,
	recapYear,
	reviewPath,
} from "@/lib/review-window";
import { fill } from "@/phi/lib/card-i18n";
import { loadSaveHistory } from "@/phi/lib/history";
import { type ObjectUrl, objectUrls } from "@/server/asset-links";
import { loadCardDesk } from "@/server/card-desk";
import { chartCatalog } from "@/server/charts";
import { getDataHost } from "@/server/data-host";
import { illKey } from "@/server/ill";
import { withDiscordUid } from "@/server/logger";
import { reviewPhaseNow, reviewView } from "@/server/review";
import { generateMetadata as missingMetadata } from "../not-found";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ recap: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const year = recapYear((await params).recap);
	if (year === null) return missingMetadata();
	const { m } = await getMessages();
	return {
		title: fill(m.wrapped.page, { year }),
		description: m.wrapped.lede,
		robots: { index: false },
	};
}

async function jacketLinks(): Promise<ObjectUrl | undefined> {
	try {
		return await objectUrls();
	} catch {
		return undefined;
	}
}

export default async function ReviewPage({ params }: Props) {
	const year = recapYear((await params).recap);
	if (year === null) notFound();
	const phase = reviewPhaseNow();
	const { locale, m } = await getMessages();
	if (phase === "soon" && year === REVIEW_YEAR) {
		return (
			<main id="content" className="page recap-page">
				<YearReview view={reviewView({ phase, locale })} />
			</main>
		);
	}
	const session = await auth();
	if (!session?.user?.id) redirect(await signInHref(reviewPath(year)));
	return (
		<Suspense
			fallback={
				<PageSkeleton className="recap-page" label={m.wrapped.loading} />
			}
		>
			<Recap
				userId={session.user.id}
				year={year}
				phase={phase === "soon" ? "complete" : phase}
				locale={locale}
			/>
		</Suspense>
	);
}

function Recap({
	userId,
	year,
	phase,
	locale,
}: {
	userId: string;
	year: number;
	phase: Exclude<ReviewPhase, "soon">;
	locale: Locale;
}) {
	return withDiscordUid(userId, async () => {
		const host = await getDataHost();
		const [loaded, catalog, links] = await Promise.all([
			loadCardDesk(host, userId),
			chartCatalog(),
			jacketLinks(),
		]);
		if ("gate" in loaded) return loaded.gate;
		const { token, manual } = loaded.bound;
		const history = await loadSaveHistory(host.rt, host.db, token);
		const view = reviewView({
			phase,
			locale,
			requested: String(year),
			manual: manual === true,
			history,
			list: catalog.list,
			...(links ? { jacketOf: (id) => links(illKey(bareId(id), "low")) } : {}),
		});
		if (view.state !== "soon" && view.year !== year)
			redirect(await localeHref(reviewPath(view.year)));
		return (
			<main id="content" className="page recap-page">
				<YearReview view={view} />
			</main>
		);
	});
}
