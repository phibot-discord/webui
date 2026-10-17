import type { Metadata } from "next";
import {
	ScoreControl,
	type ScoreControlInitial,
} from "@/components/ScoreControl";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("score");
}

export default async function ScorePage({
	searchParams,
}: {
	searchParams: Promise<{
		n?: string;
		s?: string;
		mode?: string;
		chart?: string;
	}>;
}) {
	const q = await searchParams;
	const initial: ScoreControlInitial = {
		notes: q.n,
		target: q.s,
		mode: q.mode,
		chart: q.chart,
	};
	return (
		<main id="content" className="page score-page">
			<ScoreControl initial={initial} />
		</main>
	);
}
