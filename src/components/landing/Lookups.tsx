"use client";

import {
	ArrowRight,
	BookOpenText,
	Calculator,
	ChartLineUp,
	Crosshair,
	FilmStrip,
	Flask,
	FolderOpen,
	GridFour,
	IdentificationCard,
	ImageSquare,
	MagnifyingGlass,
	Medal,
	Package,
	Ranking,
	SquaresFour,
	Tag,
	Target,
	TrendUp,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { signInDiscord } from "@/auth-actions";
import Link from "@/components/LocaleLink";
import { LevelChip } from "@/components/landing/LevelChip";
import { SignInStatus } from "@/components/landing/SignIn";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { localePath } from "@/lib/locale-path";
import { CARD_KINDS, CARD_PAGES, TOOL_PAGES } from "@/server/card-kinds";

type LookupKind = keyof Messages["home"]["lookups"];
type ExploreKind = keyof Messages["home"]["explore"]["items"];

const LOOKUPS: { kind: LookupKind; href: string }[] = [
	...CARD_KINDS.map((kind) => ({ kind, href: `/me/${kind}` })),
	...CARD_PAGES.map((page) => ({ kind: page.id, href: page.href })),
	...TOOL_PAGES.map((page) => ({ kind: page.id, href: page.href })),
];
const NEW_KINDS: ReadonlySet<LookupKind | ExploreKind> = new Set([
	"targets",
	"progress",
	"trend",
	"guess",
]);
const ICONS: Record<LookupKind | ExploreKind, typeof ArrowRight> = {
	b30: SquaresFour,
	hisb30: ChartLineUp,
	info: IdentificationCard,
	x30: Crosshair,
	fc30: Medal,
	song: Ranking,
	tags: Tag,
	simulate: Flask,
	targets: Target,
	progress: GridFour,
	trend: TrendUp,
	songs: MagnifyingGlass,
	phira: Package,
	score: Calculator,
	files: FolderOpen,
	pv: FilmStrip,
	collection: BookOpenText,
	guess: ImageSquare,
};
const EXPLORE: { kind: ExploreKind; href: string }[] = [
	{ kind: "songs", href: "/songs" },
	{ kind: "phira", href: "/phira" },
	{ kind: "score", href: "/score" },
	{ kind: "files", href: "/files" },
	{ kind: "pv", href: "/files?view=pv" },
	{ kind: "collection", href: "/files?view=collection" },
	{ kind: "guess", href: "/guess" },
];

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
				<Icon size={20} aria-hidden="true" />
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

function SignInRow({ kind, next }: { kind: LookupKind; next: string }) {
	const { m } = useI18n();
	const { pending, data } = useFormStatus();
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
	const { locale, m } = useI18n();
	const t = m.home;
	const list = (
		<ul className="lookup-grid">
			{LOOKUPS.map(({ kind, href }) => (
				<li key={kind}>
					{signedIn ? (
						<Link className="lookup" href={href}>
							<RowText
								{...t.lookups[kind]}
								isNew={NEW_KINDS.has(kind)}
								Icon={ICONS[kind]}
							/>
							<Go />
						</Link>
					) : (
						<SignInRow kind={kind} next={localePath(href, locale)} />
					)}
				</li>
			))}
		</ul>
	);
	return (
		<section className="landing-section sheet" aria-labelledby="lookups-title">
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

export function LandingExplore({
	signedIn,
	figure,
}: {
	signedIn: boolean;
	figure: ReactNode;
}) {
	const { m } = useI18n();
	const t = m.home.explore;
	return (
		<section className="landing-section" aria-labelledby="explore-title">
			<header className="section-head sheet">
				<LevelChip rank="IN" level="13" />
				<h2 id="explore-title" className="section-title">
					{t.title}
				</h2>
				<p className="section-intro">{t.intro}</p>
			</header>
			<div className="explore-body">
				{figure}
				<ul className="lookup-grid sheet">
					{EXPLORE.map(({ kind, href }) => (
						<li key={kind}>
							<Link className="lookup" href={href}>
								<RowText
									{...t.items[kind]}
									isNew={NEW_KINDS.has(kind)}
									Icon={ICONS[kind]}
								/>
								<Go>{signedIn ? null : t.hint}</Go>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
