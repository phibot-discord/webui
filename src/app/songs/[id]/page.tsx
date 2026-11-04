import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { sessionUserId } from "@/auth";
import { ChartPreview } from "@/components/ChartPreview";
import { ChartVersions } from "@/components/ChartVersions";
import Link from "@/components/LocaleLink";
import { RankCurve } from "@/components/RankCurve";
import { SimilarCharts } from "@/components/SimilarCharts";
import { SongDownloads } from "@/components/SongDownloads";
import { SongYourScores, type YourScore } from "@/components/SongYourScores";
import { localeTag } from "@/i18n/config";
import { getMessages, signInHref } from "@/i18n/server";
import { chartPoints } from "@/lib/past-self";
import { songPath } from "@/lib/song-path";
import { fill } from "@/phi/lib/card-i18n";
import { LEVEL } from "@/phi/lib/const";
import { loadSaveHistory } from "@/phi/lib/history";
import type { Save } from "@/phi/lib/save";
import type { SaveHistory } from "@/phi/lib/save-history";
import { objectUrls } from "@/server/asset-links";
import { loadBound } from "@/server/bound";
import { getDataHost } from "@/server/data-host";
import { logger } from "@/server/logger";
import { pageMetadata } from "@/server/og-meta";
import {
	type PlayedChart,
	type SongFilesView,
	type SongPageView,
	songFilesView,
	songMetaView,
	songPageView,
	songSimilar,
} from "@/server/song-page";

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
	const view = await songMetaView(slugOf((await params).id));
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
				.join(locale === "en" ? ", " : "、"),
		}),
	});
}

type Viewer =
	| { state: "signed-out" }
	| { state: "unbound" }
	| { state: "ok"; save: Save; history?: SaveHistory };

type Yours =
	| { state: "signed-out" }
	| { state: "unbound" }
	| { state: "ok"; rows: YourScore[]; save: Save };

const HISTORY_POINTS = 60;

async function viewerData(): Promise<Viewer> {
	const userId = await sessionUserId();
	if (!userId) return { state: "signed-out" };
	const host = await getDataHost();
	const got = await loadBound(host, userId, { memo: true });
	if ("error" in got) return { state: "unbound" };
	const history = await loadSaveHistory(host.rt, host.db, got.token).catch(
		(err) => {
			logger.warn(
				`song page history: ${err instanceof Error ? err.message : err}`,
			);
			return undefined;
		},
	);
	return { state: "ok", save: got.save, history };
}

function yourScores(view: SongPageView, viewer: Viewer): Yours {
	if (viewer.state !== "ok") return viewer;
	const { save, history } = viewer;
	const records = save.gameRecord[view.id] ?? [];
	const rows: YourScore[] = [];
	LEVEL.forEach((rank, i) => {
		const rec = records[i];
		const level = view.levels.find((l) => l.rank === rank);
		if (!rec || !(rec.score > 0) || !level) return;
		const points = chartPoints(history?.scoreHistory[view.id]?.[rank]);
		rows.push({
			rank,
			constant: level.constant,
			score: rec.score,
			acc: rec.acc,
			fc: rec.fc,
			rks: rec.rks,
			history: points
				.slice(-HISTORY_POINTS)
				.map(([t, acc]) => [t, Number(acc.toFixed(4))]),
		});
	});
	return { state: "ok", rows, save };
}

function playedIn(save: Save): PlayedChart {
	return (id, rank) => {
		const rec = save.getScore(id, rank);
		return rec && rec.score > 0
			? { score: rec.score, fc: rec.fc, acc: Number(rec.acc.toFixed(4)) }
			: undefined;
	};
}

async function filesOf(
	view: SongPageView,
	lang: Parameters<typeof songFilesView>[1],
): Promise<SongFilesView> {
	try {
		return await songFilesView(view, lang);
	} catch (err) {
		logger.warn(`song page files: ${err instanceof Error ? err.message : err}`);
		return { clips: [] };
	}
}

export default async function SongPage({ params }: Params) {
	const slug = slugOf((await params).id);
	const viewerJob = viewerData();
	viewerJob.catch(() => undefined);
	const [view, { m, locale }] = await Promise.all([
		objectUrls().then((links) => songPageView(slug, links)),
		getMessages(),
	]);
	if (!view) notFound();
	const t = m.songPage;
	const filesJob = filesOf(view, localeTag(locale));
	const yours = yourScores(view, await viewerJob);
	const [similar, files] = await Promise.all([
		songSimilar(view, yours.state === "ok" ? playedIn(yours.save) : undefined),
		filesJob,
	]);
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

			{view.preview ? (
				<ChartPreview
					title={view.title}
					versions={view.preview}
					cover={view.jacket}
					top={top}
					constants={Object.fromEntries(
						view.levels.map((l) => [l.rank, l.constant]),
					)}
				/>
			) : null}

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

			<RankCurve
				signIn={
					yours.state === "signed-out"
						? await signInHref(songPath(view.id))
						: undefined
				}
				id={view.id}
				levels={view.levels.map((l) => l.rank)}
				top={top}
				mine={
					yours.state === "ok"
						? Object.fromEntries(yours.rows.map((r) => [r.rank, r.acc]))
						: {}
				}
			/>

			{Object.keys(similar).length ? (
				<SimilarCharts
					lists={similar}
					top={top}
					signedIn={yours.state === "ok"}
				/>
			) : null}

			{files.chapter || files.clips.length || view.files ? (
				<section className="song-section" aria-labelledby="song-files">
					<h2 id="song-files">{t.filesTitle}</h2>
					<dl className="song-files">
						{view.files ? <SongDownloads files={view.files} /> : null}
						{files.chapter ? (
							<div>
								<dt>{t.filesCollection}</dt>
								<dd>
									<ul className="song-page-nicks">
										<li>
											<Link
												className="song-nick song-file-link"
												href={`/files?view=collection&chapter=${encodeURIComponent(files.chapter.id)}`}
												prefetch={false}
											>
												{[files.chapter.label, files.chapter.name]
													.filter(Boolean)
													.join(" · ")}
											</Link>
										</li>
									</ul>
								</dd>
							</div>
						) : null}
						{files.clips.length ? (
							<div>
								<dt>{t.filesPv}</dt>
								<dd>
									<ul className="song-page-nicks">
										{files.clips.map((c) => (
											<li key={c.id}>
												<Link
													className="song-nick song-file-link"
													data-own={c.own || undefined}
													href={`/files?view=pv&v=${encodeURIComponent(c.id)}`}
													prefetch={false}
												>
													{c.title}
												</Link>
											</li>
										))}
									</ul>
									{files.clips.some((c) => !c.own) ? (
										<p className="field-hint">{t.filesPvHint}</p>
									) : null}
								</dd>
							</div>
						) : null}
					</dl>
				</section>
			) : null}

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
