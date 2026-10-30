import type { Metadata } from "next";
import type { ReactNode } from "react";
import { sessionUserId } from "@/auth";
import { CompareForm, CompareView } from "@/components/CompareView";
import { getMessages } from "@/i18n/server";
import { compareSides } from "@/lib/compare";
import { fill } from "@/phi/lib/card-i18n";
import { chartCatalog } from "@/server/charts";
import { loadCompareSide, type SideLoad } from "@/server/compare";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("compare", { noindex: true });
}

const first = (v: string | string[] | undefined) =>
	(Array.isArray(v) ? v[0] : v)?.trim().slice(0, 200) ?? "";

export default async function ComparePage({
	searchParams,
}: {
	searchParams: Promise<{ a?: string | string[]; b?: string | string[] }>;
}) {
	const q = await searchParams;
	const a = first(q.a);
	const b = first(q.b);
	const [viewer, { m }] = await Promise.all([sessionUserId(), getMessages()]);
	const t = m.compare;
	const [sa, sb] = await Promise.all([
		loadCompareSide(a, viewer),
		loadCompareSide(b, viewer),
	]);
	const errorOf = (load: SideLoad, label: string) =>
		load.state === "bad"
			? fill(t.bad, { label })
			: load.state === "signin"
				? fill(t.signin, { label })
				: load.state === "unavailable"
					? fill(t.unavailable, { label })
					: undefined;
	const errors = [errorOf(sa, t.a), errorOf(sb, t.b)].filter((e): e is string =>
		Boolean(e),
	);
	let view: ReactNode = null;
	if (sa.state === "ok" && sb.state === "ok") {
		const result = compareSides(sa.side, sb.side);
		const ids = new Set([
			...result.both.map((h) => h.id),
			...result.best.a.map((r) => r[0]),
			...result.best.b.map((r) => r[0]),
		]);
		const { list } = await chartCatalog();
		const songs: Record<string, string> = {};
		for (const song of list) if (ids.has(song.id)) songs[song.id] = song.song;
		view = (
			<CompareView a={sa.side} b={sb.side} result={result} songs={songs} />
		);
	}
	return (
		<main id="content" className="page compare-page">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<CompareForm a={a} b={b} signedIn={Boolean(viewer)} errors={errors} />
			{view}
		</main>
	);
}
