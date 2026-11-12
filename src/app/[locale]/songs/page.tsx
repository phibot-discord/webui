import type { Metadata } from "next";
import { auth } from "@/auth";
import {
	SongLookup,
	type SongLookupExample,
	type SongLookupInitial,
	type SongRow,
} from "@/components/SongLookup";
import type { ChartSummary } from "@/lib/chart-catalog";
import { rankSongs } from "@/lib/song-search";
import { ALIAS_MAX_LEN } from "@/server/aliases";
import { songCatalog } from "@/server/charts";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

const SHOWN = 20;
const EXAMPLES = ["无限光", "ASA", "Ad"];

function allSongs(list: readonly ChartSummary[]): SongRow[] {
	const rows = list.map(({ id, song, composer, charts, gone }) => ({
		id,
		song,
		composer,
		charts,
		...(gone ? { gone } : {}),
	}));
	return [...rows.filter((s) => !s.gone), ...rows.filter((s) => s.gone)];
}

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("songs", { path: "/songs" });
}

export default async function SongsPage({
	searchParams,
}: {
	searchParams: Promise<{ q?: string | string[] }>;
}) {
	const raw = (await searchParams).q;
	const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, ALIAS_MAX_LEN);
	const session = await auth();
	let initial: SongLookupInitial;
	let all: SongRow[] = [];
	let examples: SongLookupExample[] = EXAMPLES.map((text) => ({
		q: text,
		songs: [],
	}));
	try {
		const { list } = await songCatalog();
		const found = q ? rankSongs(list, q, { limit: list.length }) : [];
		initial = {
			q: q ?? "",
			total: found.length,
			hits: found.slice(0, SHOWN),
		};
		all = allSongs(list);
		examples = EXAMPLES.map((text) => ({
			q: text,
			songs: rankSongs(list, text, { exact: true }).map((hit) => hit.song.song),
		}));
	} catch {
		initial = { q: q ?? "", total: 0, hits: [], failed: true };
	}
	return (
		<main id="content" className="page songs-page">
			<SongLookup
				initial={initial}
				examples={examples}
				all={all}
				shown={SHOWN}
				maxLength={ALIAS_MAX_LEN}
				signedIn={Boolean(session?.user?.id)}
			/>
		</main>
	);
}
