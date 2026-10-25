import type { Messages } from "@/i18n/messages";
import type { CollectionLang } from "@/lib/collection";
import { textsHref } from "@/lib/files-view";
import {
	keyed,
	type TextSection,
	textAnchor,
	type ViewTextGroup,
} from "@/lib/texts";
import { fill } from "@/phi/lib/card-i18n";
import type { Crumb } from "./Breadcrumb";
import { CollectionToc } from "./CollectionToc";
import { DocHead } from "./DocHead";
import { FilesSwap } from "./FilesFrame";
import { FilesLink } from "./FilesLink";
import { LangSwitch } from "./LangSwitch";
import { RichText } from "./RichText";

export type TextsSectionNav = { id: TextSection; name: string; count: number };

export type TextsBody =
	| {
			kind: "list";
			lang: CollectionLang;
			fallback: boolean;
			lines: readonly string[];
	  }
	| { kind: "groups"; groups: ViewTextGroup[] }
	| { kind: "avatars"; avatars: { name: string; src: string }[] };

export function TextGroups({
	groups,
	t,
}: {
	groups: ViewTextGroup[];
	t: Messages["texts"];
}) {
	return (
		<div className="doc-body">
			{groups.map((group) => {
				const anchor = textAnchor(group.id);
				return (
					<section key={group.id} className="texts-group">
						<h2 id={anchor}>
							<a href={`#${anchor}`}>
								{group.title}
								<span className="coll-anchor" aria-hidden="true">
									#
								</span>
							</a>
						</h2>
						{group.note ? <p className="texts-note">{group.note}</p> : null}
						{group.images.length ? (
							<div className="texts-images">
								{group.images.map((image, at) => (
									<a
										key={image.src}
										className="texts-image"
										href={image.src}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={`${fill(t.image, { title: group.title, n: at + 1 })} ${t.newTab}`}
									>
										{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
										<img
											src={image.src}
											alt={fill(t.image, { title: group.title, n: at + 1 })}
											width={image.width}
											height={image.height}
											loading="lazy"
											decoding="async"
										/>
									</a>
								))}
							</div>
						) : null}
						{group.lines.length ? (
							<ul className="texts-lines">
								{keyed(group.lines, (l) => `${l.lang ?? ""}:${l.text}`).map(
									({ key, item: line }) => (
										<li key={key} lang={line.lang}>
											<RichText text={line.text} />
										</li>
									),
								)}
							</ul>
						) : null}
					</section>
				);
			})}
		</div>
	);
}

export function GameTexts({
	sections,
	current,
	heading,
	body,
	lang,
	siteLang,
	crumbs,
	crumbLabel,
	tocLabel,
	t,
}: {
	sections: TextsSectionNav[];
	current: TextSection;
	heading: { name: string; lede: string };
	body: TextsBody | undefined;
	lang: CollectionLang;
	siteLang: CollectionLang;
	crumbs: Crumb[];
	crumbLabel: string;
	tocLabel: string;
	t: Messages["texts"];
}) {
	const picked = lang === siteLang ? undefined : lang;
	return (
		<article className="doc" aria-labelledby="doc-title">
			<DocHead crumbs={crumbs} crumbLabel={crumbLabel} title={heading.name}>
				{heading.lede}
			</DocHead>
			{body?.kind === "avatars" ? null : (
				<LangSwitch
					lang={lang}
					siteLang={siteLang}
					label={t.textLang}
					href={(each) => textsHref(current, each)}
				/>
			)}
			<nav className="coll-chapters" aria-label={t.sectionsLabel}>
				<ul className="coll-chips texts-chips">
					{sections.map((section) => (
						<li key={section.id}>
							<FilesLink
								className="coll-chip texts-chip"
								href={textsHref(section.id, picked)}
								aria-current={section.id === current ? "page" : undefined}
							>
								{section.name}
								<span className="texts-chip-count">{section.count}</span>
							</FilesLink>
						</li>
					))}
				</ul>
			</nav>
			<FilesSwap>
				{body?.kind === "groups" ? (
					<CollectionToc label={tocLabel} variant="popover" />
				) : null}
				{!body ? (
					<p className="callout" role="status">
						{t.unavailable}
					</p>
				) : body.kind === "list" ? (
					<>
						<p className="texts-count">
							{fill(t.count, { n: body.lines.length })}
						</p>
						{body.fallback ? <p className="coll-note">{t.fallback}</p> : null}
						<ol className="texts-list" lang={body.lang}>
							{keyed(body.lines, (l) => l).map(({ key, item: line }) => (
								<li key={key}>
									<RichText text={line} />
								</li>
							))}
						</ol>
					</>
				) : body.kind === "groups" ? (
					<TextGroups groups={body.groups} t={t} />
				) : (
					<ul className="texts-avatars">
						{body.avatars.map((avatar) => (
							<li key={avatar.name}>
								<figure>
									{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
									<img
										src={avatar.src}
										alt=""
										width={96}
										height={96}
										loading="lazy"
										decoding="async"
									/>
									<figcaption>{avatar.name}</figcaption>
								</figure>
							</li>
						))}
					</ul>
				)}
			</FilesSwap>
		</article>
	);
}
