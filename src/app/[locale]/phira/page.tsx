import type { Metadata } from "next";
import { Figure } from "@/components/Figure";
import { PhiraPack } from "@/components/PhiraPack";
import { getMessages } from "@/i18n/server";
import { fill } from "@/phi/lib/card-i18n";
import { pageMetadata } from "@/server/og-meta";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("phira", { path: "/phira" });
}

export default async function PhiraPage({
	searchParams,
}: {
	searchParams: Promise<{ song?: string | string[] }>;
}) {
	const raw = (await searchParams).song;
	const initialId = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 160);
	const { m } = await getMessages();
	const f = m.figures;
	return (
		<main id="content" className="page page-split">
			<div className="page-main">
				<PhiraPack initialId={initialId || undefined} />
			</div>
			<aside className="page-aside">
				<Figure
					name="pez"
					label={fill(f.label, { n: 1 })}
					caption={f.pez.caption}
					parts={f.pez.parts}
				/>
			</aside>
		</main>
	);
}
