import {
	COLLECTION_LANG_NAMES,
	COLLECTION_LANG_SHORT,
	type CollectionLang,
} from "@/lib/collection";

export function LangName({ lang }: { lang: CollectionLang }) {
	return (
		<span lang={lang}>
			<span className="lang-long">{COLLECTION_LANG_NAMES[lang]}</span>
			<span className="lang-short" aria-hidden="true">
				{COLLECTION_LANG_SHORT[lang]}
			</span>
		</span>
	);
}
