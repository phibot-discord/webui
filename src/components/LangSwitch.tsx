import Link from "next/link";
import { COLLECTION_LANGS, type CollectionLang } from "@/lib/collection";
import { LangName } from "./LangName";

export function LangSwitch({
	lang,
	siteLang,
	label,
	href,
}: {
	lang: CollectionLang;
	siteLang: CollectionLang;
	label: string;
	href: (lang: CollectionLang | undefined) => string;
}) {
	return (
		<nav className="coll-langs" aria-label={label}>
			<span className="coll-langs-label" aria-hidden="true">
				{label}
			</span>
			<ul>
				{COLLECTION_LANGS.map((each) => (
					<li key={each}>
						<Link
							href={href(each === siteLang ? undefined : each)}
							prefetch={false}
							hrefLang={each}
							aria-current={each === lang ? "true" : undefined}
						>
							<LangName lang={each} />
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
