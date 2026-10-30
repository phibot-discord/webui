import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ChartVersions } from "@/components/ChartVersions";
import Link from "@/components/LocaleLink";
import { SongYourScores, type YourScore } from "@/components/SongYourScores";
import { getMessages, signInHref } from "@/i18n/server";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL } from "@/phi/lib/const";
import { objectUrls } from "@/server/asset-links";
import { loadBound } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { pageMetadata } from "@/server/og-meta";
import { type SongPageView, songPageView } from "@/server/song-page";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function slugOf(raw: string): string {
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const view = await songPageView(slugOf((await params).id), () => undefined);
	if (!view) return pageMetadata("songs", { noindex: true });
	const { locale, m } = await getMessages();
	return pageMetadata("songs", {
		path: songPath(view.id),
		title: view.title,
		description: fill(m.songPage.description, {
			title: view.title,
			composer: view.composer || "—",
			levels: view.levels
				.map((l) => `${l.rank} ${l.constant.toFixed(1)}`)
				.join(locale === "zh" ? "、" : ", "),
		}),
	});
}

type Yours =
	| { state: "signed-out" }
	| { state: "unbound" }
	| { state: "ok"; rows: YourScore[] };

async function yourScores(view: SongPageView): Promise<Yours> {
	const session = await auth();
	const userId = session?.user?.id;
	if (!userId) return { state: "signed-out" };
	const got = await loadBound(await getDataHost(), userId, { memo: true });
	if ("error" in got) return { state: "unbound" };
	const records = got.save.gameRecord[view.id] ?? [];
	const rows: YourScore[] = [];
	LEVEL.forEach((rank, i) => {
		const rec = records[i];
		const level = view.levels.find((l) => l.rank === rank);
		if (!rec || !(rec.score > 0) || !level) return;
		rows.push({
			rank,
			constant: level.constant,
			score: rec.score,
			acc: rec.acc,
			fc: rec.fc,
			rks: rec.rks,
		});
	});
	return { state: "ok", rows };
}

export default async function SongPage({ params }: Params) {
	const slug = slugOf((await params).id);
	const [view, { m }] = await Promise.all([
		objectUrls().then((links) => songPageView(slug, links)),
		getMessages(),
	]);
	if (!view) notFound();
	const t = m.songPage;
	const yours = await yourScores(view);
	const top = view.levels.at(-1)?.rank ?? "IN";
	const meta = [
		[t.composer, view.composer],
		[t.illustrator, view.illustrator],
		[t.chapter, view.chapter],
		[t.bpm, view.bpm],
		[t.length, view.length],
	].filter(([, v]) => v);

	return (
		<main id="content" className="page song-page">
			<p className="song-back">
				<Link href="/songs" prefetch={false}>
					← {t.back}
				</Link>
			</p>
			<header className="song-head">
				{view.jacket ? (
					<a className="song-jacket" href={view.jacketFull ?? view.jacket}>
						{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
						<img
							src={view.jacket}
							alt={fill(t.jacketAlt, { title: view.title })}
							width={512}
							height={270}
						/>
					</a>
				) : null}
				<div className="song-id">
					<h1>{view.title}</h1>
					<dl className="song-meta">
						{meta.map(([k, v]) => (
							<div key={k}>
								<dt>{k}</dt>
								<dd>{v}</dd>
							</div>
						))}
					</dl>
					<div className="song-actions">
						<Link
							className="btn btn-primary"
							href={`/phira?song=${encodeURIComponent(view.id)}`}
							prefetch={false}
						>
							{t.phira}
						</Link>
						<Link
							className="btn btn-ghost"
							href={`/score?chart=${encodeURIComponent(`${view.id}:${top}`)}`}
							prefetch={false}
						>
							{t.score}
						</Link>
						{yours.state === "ok" ? (
							<Link
								className="btn btn-ghost"
								href={`/me/song?chart=${encodeURIComponent(view.id)}&level=${top}`}
								prefetch={false}
							>
								{t.songCard}
							</Link>
						) : null}
					</div>
				</div>
			</header>

			<section className="song-section" aria-labelledby="song-levels">
				<h2 id="song-levels">{t.levelsTitle}</h2>
				<div className="data-scroll">
					<table className="data-table song-levels">
						<thead>
							<tr>
								<th scope="col">{t.level}</th>
								<th scope="col" className="num">
									{t.constant}
								</th>
								<th scope="col" className="num">
									{t.notes}
								</th>
								<th scope="col" className="num">
									{t.kinds}
								</th>
								<th scope="col">{t.charter}</th>
							</tr>
						</thead>
						<tbody>
							{view.levels.map((l) => (
								<tr key={l.rank}>
									<th scope="row">
										<span className="song-level">
											{l.jacket ? (
												// biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain
												<img
													src={l.jacket}
													alt={fill(t.levelJacket, { level: l.rank })}
													width={64}
													height={34}
												/>
											) : null}
											<span className={`chart-level chart-level-${l.rank}`}>
												{l.rank}
											</span>
										</span>
									</th>
									<td className="num">{l.constant.toFixed(1)}</td>
									<td className="num">{l.notes ?? "—"}</td>
									<td className="num">
										{l.kinds
											? `${l.kinds.tap} · ${l.kinds.drag} · ${l.kinds.hold} · ${l.kinds.flick}`
											: "—"}
									</td>
									<td className="song-charter">{l.charter || "—"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			<section className="song-section" aria-labelledby="song-yours">
				<h2 id="song-yours">{t.yoursTitle}</h2>
				{yours.state === "signed-out" ? (
					<p className="callout">
						{t.yoursSignedOut}{" "}
						<Link href={await signInHref(songPath(view.id))} prefetch={false}>
							{t.signIn}
						</Link>
					</p>
				) : yours.state === "unbound" ? (
					<p className="callout">
						{t.yoursNotBound}{" "}
						<Link href="/me" prefetch={false}>
							{m.nav.cards}
						</Link>
					</p>
				) : yours.rows.length ? (
					<SongYourScores id={view.id} rows={yours.rows} />
				) : (
					<p className="callout">{t.yoursNone}</p>
				)}
			</section>

			<ChartVersions id={view.id} levels={view.levels} history={view.history} />

			{view.aliases.length ? (
				<section className="song-section" aria-labelledby="song-nicks">
					<h2 id="song-nicks">{t.nicknames}</h2>
					<ul className="song-page-nicks">
						{view.aliases.map((a) => (
							<li key={a} className="song-nick">
								{a}
							</li>
						))}
					</ul>
				</section>
			) : null}
		</main>
	);
}
