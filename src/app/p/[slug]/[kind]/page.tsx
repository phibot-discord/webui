import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { signInDiscord } from "@/auth-actions";
import { CardNav } from "@/components/CardNav";
import { CardStage } from "@/components/CardStage";
import { Desk } from "@/components/Desk";
import { SignInButton, SignInStatus } from "@/components/landing/SignIn";
import { getMessages } from "@/i18n/server";
import {
	cardStyles,
	isStyledKind,
	parseCardStyle,
} from "@/phi/lib/card-styles";
import { lastSyncedIso } from "@/server/bound";
import { isPublicKind } from "@/server/card-kinds";
import { parsePaintQuality } from "@/server/render/paint-budget";
import { loadShared } from "./load-shared";

export const dynamic = "force-dynamic";

export async function generateMetadata(
	{
		params,
	}: {
		params: Promise<{ slug: string; kind: string }>;
	},
	parent: ResolvingMetadata,
): Promise<Metadata> {
	const { slug, kind } = await params;
	if (!isPublicKind(kind)) return {};
	const [shared, { m }, prev] = await Promise.all([
		loadShared(slug),
		getMessages(),
		parent,
	]);
	if (!shared) return {};
	const card = m.card.titles[kind];
	const title = `${card} · ${shared.player}`;
	const description = m.public.metaDescription
		.replaceAll("{player}", shared.player)
		.replaceAll("{card}", card)
		.replaceAll("{rks}", shared.rks);
	const images = prev.openGraph?.images ?? [];
	return {
		title,
		description,
		openGraph: {
			type: "profile",
			siteName: m.brand,
			locale: prev.openGraph?.locale,
			title,
			description,
			url: `/p/${slug}/${kind}`,
			images,
		},
		twitter: {
			card: images.length ? "summary_large_image" : "summary",
			title,
			description,
			images,
		},
	};
}

export default async function PublicKindPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string; kind: string }>;
	searchParams: Promise<{ quality?: string; style?: string }>;
}) {
	const { slug, kind } = await params;
	if (!isPublicKind(kind)) notFound();
	const [shared, q, { m }, session] = await Promise.all([
		loadShared(slug),
		searchParams,
		getMessages(),
		auth(),
	]);
	if (!shared) notFound();
	const { got, notes, player, rks } = shared;
	const signedIn = Boolean(session?.user?.id);

	return (
		<Desk
			title={player}
			rks={rks}
			lastSyncedIso={lastSyncedIso(got.save)}
			publicHint
			note={got.manual ? m.manual.deskNote : undefined}
			tools={
				<Link className="btn btn-ghost desk-mast-cta" href="/" prefetch={false}>
					{m.public.cta}
					<ArrowRight aria-hidden="true" size={16} />
				</Link>
			}
			nav={<CardNav current={kind} base={`/p/${slug}`} />}
		>
			<CardStage
				kind={kind}
				srcBase={`/api/public/${slug}/card/${kind}`}
				player={player}
				rks={rks}
				counted={false}
				initialCount={33}
				initialQuality={parsePaintQuality(q.quality ?? notes.cardQuality)}
				styles={cardStyles(kind)}
				initialStyle={parseCardStyle(
					kind,
					q.style ?? (isStyledKind(kind) ? notes.cardStyle?.[kind] : undefined),
				)}
			/>
			<aside className="desk-cta" aria-labelledby="desk-cta-title">
				<h2 id="desk-cta-title">{m.public.cta}</h2>
				{signedIn ? null : <p>{m.public.ctaLede}</p>}
				{signedIn ? (
					<Link className="btn btn-primary" href="/me/b30" prefetch={false}>
						{m.home.openDesk}
						<ArrowRight aria-hidden="true" size={16} />
					</Link>
				) : (
					<div className="desk-cta-actions">
						<form action={signInDiscord}>
							<input type="hidden" name="next" value="/me" />
							<SignInButton />
							<SignInStatus />
						</form>
						<Link
							className="btn btn-ghost btn-skew"
							href="/login/taptap"
							prefetch={false}
						>
							<span>{m.signInTaptap}</span>
						</Link>
					</div>
				)}
			</aside>
		</Desk>
	);
}
