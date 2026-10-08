"use client";

import {
	ArrowRight,
	ChartLineUp,
	Crosshair,
	IdentificationCard,
	MagnifyingGlass,
	Medal,
	Ranking,
	SquaresFour,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { signInDiscord } from "@/auth-actions";
import { LevelChip } from "@/components/landing/LevelChip";
import { SignInStatus } from "@/components/landing/SignIn";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

type LookupKind = keyof Messages["home"]["lookups"];

const KINDS: LookupKind[] = ["b30", "hisb30", "info", "x30", "fc30", "song"];
const NEW_KINDS: ReadonlySet<LookupKind> = new Set(["song"]);
const ICONS: Record<LookupKind, typeof ArrowRight> = {
	b30: SquaresFour,
	hisb30: ChartLineUp,
	info: IdentificationCard,
	x30: Crosshair,
	fc30: Medal,
	song: Ranking,
};

function RowText({
	name,
	blurb,
	isNew,
	Icon,
}: {
	name: string;
	blurb: string;
	isNew: boolean;
	Icon: typeof ArrowRight;
}) {
	const { m } = useI18n();
	return (
		<>
			<span className="lookup-icon">
				<Icon size={22} aria-hidden="true" />
			</span>
			<span className="lookup-name">
				{name}
				{isNew ? <span className="badge">{m.home.newLabel}</span> : null}
			</span>
			<span className="lookup-blurb">{blurb}</span>
		</>
	);
}

function Go({ children }: { children?: ReactNode }) {
	return (
		<span className="lookup-go">
			{children}
			<ArrowRight size={16} aria-hidden="true" />
		</span>
	);
}

function SignInRow({ kind }: { kind: LookupKind }) {
	const { m } = useI18n();
	const { pending, data } = useFormStatus();
	const next = `/me/${kind}`;
	const item = m.home.lookups[kind];
	return (
		<button className="lookup" type="submit" name="next" value={next}>
			<RowText {...item} isNew={NEW_KINDS.has(kind)} Icon={ICONS[kind]} />
			<Go>
				{pending && data?.get("next") === next
					? m.home.signingIn
					: m.home.signInHint}
			</Go>
		</button>
	);
}

export function LandingLookups({ signedIn }: { signedIn: boolean }) {
	const { m } = useI18n();
	const t = m.home;
	const list = (
		<ul className="lookup-grid">
			{KINDS.map((kind) => (
				<li key={kind}>
					{signedIn ? (
						<Link className="lookup" href={`/me/${kind}`}>
							<RowText
								{...t.lookups[kind]}
								isNew={NEW_KINDS.has(kind)}
								Icon={ICONS[kind]}
							/>
							<Go />
						</Link>
					) : (
						<SignInRow kind={kind} />
					)}
				</li>
			))}
			<li className="lookup-wide">
				<Link className="lookup" href="/songs">
					<RowText
						name={t.nicknames.name}
						blurb={t.nicknames.blurb}
						isNew
						Icon={MagnifyingGlass}
					/>
					<Go>{signedIn ? null : t.nicknames.hint}</Go>
				</Link>
			</li>
		</ul>
	);
	return (
		<section className="landing-section" aria-labelledby="lookups-title">
			<header className="section-head">
				<LevelChip rank="HD" level="10" />
				<h2 id="lookups-title" className="section-title">
					{t.lookupsTitle}
				</h2>
				<p className="section-intro">
					{signedIn ? t.lookupsSignedIn : t.lookupsSignedOut}
				</p>
			</header>
			{signedIn ? (
				list
			) : (
				<form className="lookups-form" action={signInDiscord}>
					{list}
					<SignInStatus />
				</form>
			)}
		</section>
	);
}
