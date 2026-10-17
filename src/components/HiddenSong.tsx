import { ArrowSquareOut, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import type { Messages } from "@/i18n/messages";
import type { HiddenBackground, HiddenChart } from "@/lib/c9s6";
import { noteTotal } from "@/lib/c9s6";
import { fill } from "@/phi/lib/card-i18n";
import { Cutscene, type CutsceneView } from "./Cutscene";

export type HiddenDownload = {
	id: "pack" | "chart" | "music" | "background";
	filename: string;
	url: string;
	save: boolean;
	size?: string;
};

export type HiddenSongView = {
	name: string;
	level: string;
	difficulty: string;
	chart: HiddenChart | null;
	background: HiddenBackground | null;
	music: string | undefined;
	downloads: HiddenDownload[];
	cutscene: CutsceneView | undefined;
};

type Copy = Messages["c9s6"];

function bpmText(bpm: number): string {
	return String(Math.round(bpm * 100) / 100);
}

function statsOf(chart: HiddenChart, t: Copy) {
	const { notes, lines, bpm } = chart;
	return [
		...(notes
			? [
					{ id: "tap", label: t.tap, value: notes.tap },
					{ id: "drag", label: t.drag, value: notes.drag },
					{ id: "hold", label: t.hold, value: notes.hold },
					{ id: "flick", label: t.flick, value: notes.flick },
					{ id: "notes", label: t.notes, value: noteTotal(notes) },
				]
			: []),
		...(lines ? [{ id: "lines", label: t.lines, value: lines }] : []),
		...(bpm ? [{ id: "bpm", label: t.bpm, value: bpmText(bpm) }] : []),
	];
}

function downloadLabel(id: HiddenDownload["id"], t: Copy): string {
	switch (id) {
		case "pack":
			return t.pack;
		case "chart":
			return t.chart;
		case "music":
			return t.musicFile;
		case "background":
			return t.background;
	}
}

export function HiddenSong({ song, t }: { song: HiddenSongView; t: Copy }) {
	const stats = song.chart ? statsOf(song.chart, t) : [];
	return (
		<div className="hs">
			<div className="hs-facts">
				<p className="hs-level">
					<span className="sr-only">{t.level}: </span>
					<span className={`chart-level chart-level-${song.level}`}>
						<span>{song.level}</span>
						<span>Lv.{song.difficulty}</span>
					</span>
				</p>
				{stats.length ? (
					<dl className="hs-stats">
						{stats.map((stat) => (
							<div key={stat.id} className="hs-stat">
								<dt>{stat.label}</dt>
								<dd>{stat.value}</dd>
							</div>
						))}
					</dl>
				) : null}
			</div>

			{song.music ? (
				<section className="hs-section" aria-labelledby="hs-music">
					<h2 id="hs-music">{t.music}</h2>
					{/* biome-ignore lint/a11y/useMediaCaption: game music, there are no captions to offer */}
					<audio
						className="hs-audio"
						src={song.music}
						aria-label={fill(t.musicLabel, { name: song.name })}
						controls
						preload="none"
					/>
				</section>
			) : null}

			{song.downloads.length ? (
				<section className="hs-section" aria-labelledby="hs-downloads">
					<h2 id="hs-downloads">{t.downloads}</h2>
					<ul className="hs-files">
						{song.downloads.map((file) => {
							const label = downloadLabel(file.id, t);
							const dims =
								file.id === "background" && song.background
									? `${song.background.width}×${song.background.height}`
									: "";
							const meta = [file.filename, dims, file.size ?? ""]
								.filter(Boolean)
								.join(" · ");
							return (
								<li key={file.id} className="hs-file">
									<div className="hs-file-copy">
										<span className="hs-file-name">{label}</span>
										<span className="hs-file-meta">{meta}</span>
									</div>
									{file.save ? (
										<a
											className="btn btn-ghost btn-sm"
											href={file.url}
											download={file.filename}
											aria-label={`${t.download} · ${label} · ${file.filename}`}
										>
											{t.download}
											<DownloadSimple size={14} aria-hidden />
										</a>
									) : (
										<a
											className="btn btn-ghost btn-sm"
											href={file.url}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={`${t.download} · ${label} · ${file.filename} ${t.newTab}`}
										>
											{t.download}
											<ArrowSquareOut size={14} aria-hidden />
										</a>
									)}
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			<section
				className="hs-section"
				id="cutscene"
				aria-labelledby="hs-cutscene"
			>
				<h2 id="hs-cutscene">{t.cutscene}</h2>
				{song.cutscene ? (
					<>
						<p className="hs-note">{t.cutsceneLede}</p>
						<Cutscene view={song.cutscene} t={t} />
					</>
				) : (
					<p className="callout" role="status">
						{t.cutsceneMissing}
					</p>
				)}
			</section>
		</div>
	);
}
