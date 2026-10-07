"use client";

import { ArrowRight } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { signInDiscord } from "@/auth-actions";
import { SignInStatus } from "@/components/landing/SignIn";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

type LookupKind = keyof Messages["home"]["lookups"];

const KINDS: LookupKind[] = ["b30", "hisb30", "info", "x30", "fc30", "song"];
const NEW_KINDS: ReadonlySet<LookupKind> = new Set(["song"]);

function RowText({
	name,
	blurb,
	isNew,
}: {
	name: string;
	blurb: string;
	isNew: boolean;
}) {
	const { m } = useI18n();
	return (
		<>
			<span className="lookup-name">
				{name}
				{isNew ? <span className="flag">{m.home.newLabel}</span> : null}
			</span>
			<span className="lookup-blurb">{blurb}</span>
		</>
	);
}

function Go({ children }: { children?: ReactNode }) {
	return (
		<span className="lookup-go">
			{children}
			<ArrowRight size={18} aria-hidden="true" />
		</span>
	);
}

/** One submit button per card, so Discord sends the visitor back to that card */
function SignInRow({ kind }: { kind: LookupKind }) {
	const { m } = useI18n();
	const { pending, data } = useFormStatus();
	const next = `/me/${kind}`;
	const item = m.home.lookups[kind];
	return (
		<button className="lookup-row" type="submit" name="next" value={next}>
			<RowText {...item} isNew={NEW_KINDS.has(kind)} />
			<Go>
				{pending && data?.get("next") === next
					? m.home.signingIn
					: m.home.signInHint}
			</Go>
		</button>
	);
}

/**
 * Index of the cards. Signed in, each row links to the card; signed out, each
 * row starts Discord sign-in with that card as the return address
 */
export function LandingLookups({ signedIn }: { signedIn: boolean }) {
	const { m } = useI18n();
	const t = m.home;
	const list = (
		<ul className="lookup-list">
			{KINDS.map((kind) => (
				<li key={kind}>
					{signedIn ? (
						<Link className="lookup-row" href={`/me/${kind}`}>
							<RowText {...t.lookups[kind]} isNew={NEW_KINDS.has(kind)} />
							<Go />
						</Link>
					) : (
						<SignInRow kind={kind} />
					)}
				</li>
			))}
			<li>
				<Link className="lookup-row" href="/songs">
					<RowText name={t.nicknames.name} blurb={t.nicknames.blurb} isNew />
					<Go>{signedIn ? null : t.nicknames.hint}</Go>
				</Link>
			</li>
		</ul>
	);
	return (
		<section className="lookups" aria-labelledby="lookups-title">
			<div className="lookups-head">
				<h2 id="lookups-title">{t.lookupsTitle}</h2>
				<p>{signedIn ? t.lookupsSignedIn : t.lookupsSignedOut}</p>
			</div>
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
