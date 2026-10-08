import Link from "next/link";
import type { ReactNode } from "react";
import { localeTag } from "@/i18n/config";
import { LEGAL_UPDATED, type LegalDoc } from "@/i18n/legal";
import { getMessages } from "@/i18n/server";

function inline(text: string): ReactNode[] {
	const out: ReactNode[] = [];
	const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
	let last = 0;
	for (const match of text.matchAll(re)) {
		const at = match.index ?? 0;
		if (at > last) out.push(text.slice(last, at));
		const [whole, bold, label, href] = match;
		if (bold) {
			out.push(<strong key={at}>{bold}</strong>);
		} else if (href?.startsWith("/")) {
			out.push(
				<Link key={at} href={href}>
					{label}
				</Link>,
			);
		} else {
			out.push(
				<a key={at} href={href} rel="noopener noreferrer">
					{label}
				</a>,
			);
		}
		last = at + whole.length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out;
}

export async function LegalPage({
	doc,
	other,
}: {
	doc: LegalDoc;
	other: { href: string; label: string };
}) {
	const { locale, m } = await getMessages();
	const date = new Intl.DateTimeFormat(localeTag(locale), {
		dateStyle: "long",
		timeZone: "UTC",
	}).format(new Date(LEGAL_UPDATED));
	return (
		<main id="content" className="page legal-page">
			<header className="legal-head">
				<h1>{doc.title}</h1>
				<p className="lede">{doc.lede}</p>
				<p className="legal-updated">
					{m.legal.updated} <time dateTime={LEGAL_UPDATED}>{date}</time>
				</p>
			</header>
			<nav className="legal-toc" aria-labelledby="legal-toc-title">
				<h2 id="legal-toc-title">{m.legal.contents}</h2>
				<ol>
					{doc.sections.map((s) => (
						<li key={s.id}>
							<a href={`#${s.id}`}>{s.title}</a>
						</li>
					))}
				</ol>
			</nav>
			{doc.sections.map((s, i) => (
				<section
					key={s.id}
					id={s.id}
					className="legal-section"
					aria-labelledby={`${s.id}-title`}
				>
					<h2 id={`${s.id}-title`}>
						<span className="legal-num" aria-hidden="true">
							{String(i + 1).padStart(2, "0")}
						</span>
						{s.title}
					</h2>
					{s.body.map((block) =>
						Array.isArray(block) ? (
							<ul key={block[0]}>
								{block.map((item) => (
									<li key={item}>{inline(item)}</li>
								))}
							</ul>
						) : (
							<p key={block}>{inline(block)}</p>
						),
					)}
				</section>
			))}
			<p className="legal-other">
				<Link href={other.href}>{other.label}</Link>
			</p>
		</main>
	);
}
