"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { saveBlob, versionSpan } from "@/lib/apk-version";
import { formatSize } from "@/lib/assets";
import { corsUrl } from "@/lib/chart-player/base";
import { fill } from "@/phi/lib/card-i18n";
import type { ArtFile, SongFile, Tree } from "@/server/song-assets";
import type { SongFilesData } from "@/server/song-page";

function Save({
	file,
	label,
	className = "btn btn-ghost btn-sm",
}: {
	file: SongFile;
	label: string;
	className?: string;
}) {
	const { m } = useI18n();
	const t = m.songFiles;
	const [busy, setBusy] = useState(false);
	return (
		<a
			className={className}
			href={file.url}
			download={file.name}
			aria-label={fill(t.saveLabel, {
				name: file.name,
				size: formatSize(file.size),
			})}
			aria-busy={busy || undefined}
			onClick={async (event) => {
				if (event.metaKey || event.ctrlKey || event.shiftKey) return;
				event.preventDefault();
				if (busy) return;
				setBusy(true);
				try {
					const res = await fetch(corsUrl(file.url));
					if (!res.ok) throw new Error(String(res.status));
					saveBlob(await res.blob(), file.name);
				} catch {
					window.open(file.url, "_blank", "noopener");
				} finally {
					setBusy(false);
				}
			}}
		>
			{busy ? t.saving : label}
			<DownloadSimple size={14} aria-hidden />
		</a>
	);
}

export function SongDownloads({ files }: { files: SongFilesData }) {
	const { m } = useI18n();
	const t = m.songFiles;
	const p = m.chartPlayer;
	const treeName = (tree: Tree, rev?: string, versions?: string[]) => {
		if (tree === "current") return p.current;
		if (tree === "removed") return p.removed;
		if (tree === "fools") return p.fools;
		return versionSpan(versions?.length ? versions : rev ? [rev] : []);
	};
	const variantName: Record<ArtFile["variant"], string> = {
		ill: t.full,
		illLow: t.small,
		illBlur: t.blur,
		SP: t.sp,
	};
	const artGroups = new Map<string, ArtFile[]>();
	for (const a of files.art) {
		const key = `${a.tree}|${a.level ?? ""}`;
		const list = artGroups.get(key) ?? [];
		list.push(a);
		artGroups.set(key, list);
	}
	const multiTree = new Set(files.art.map((a) => a.tree)).size > 1;

	return (
		<>
			{files.music.length ? (
				<div>
					<dt>{t.music}</dt>
					<dd>
						<ul className="sf-music">
							{files.music.map((f) => (
								<li key={f.key}>
									{files.music.length > 1 ? (
										<span className="sf-tag">{treeName(f.tree)}</span>
									) : null}
									{/* biome-ignore lint/a11y/useMediaCaption: game music, there are no captions to offer */}
									<audio
										className="sf-audio"
										src={f.url}
										controls
										preload="none"
										aria-label={fill(t.listen, { name: f.name })}
									/>
									<Save file={f} label={t.download} />
								</li>
							))}
						</ul>
					</dd>
				</div>
			) : null}
			{artGroups.size ? (
				<div>
					<dt>{t.art}</dt>
					<dd>
						<ul className="sf-art">
							{[...artGroups.values()].map((group) => {
								const first = group[0];
								if (!first) return null;
								const thumb =
									group.find((a) => a.variant === "illLow") ?? first;
								const name = [
									multiTree ? treeName(first.tree) : "",
									first.level ?? "",
								]
									.filter(Boolean)
									.join(" · ");
								return (
									<li key={`${first.tree}-${first.level ?? ""}`}>
										{/* biome-ignore lint/performance/noImgElement: R2 object, loaded straight from the public domain */}
										<img
											className="sf-thumb"
											src={thumb.url}
											alt=""
											loading="lazy"
											decoding="async"
											width={256}
											height={135}
										/>
										{name ? <span className="sf-tag">{name}</span> : null}
										<span className="sf-actions">
											{group.map((a) => (
												<Save
													key={a.key}
													file={a}
													label={variantName[a.variant]}
												/>
											))}
										</span>
									</li>
								);
							})}
						</ul>
					</dd>
				</div>
			) : null}
			{files.charts.length ? (
				<div>
					<dt>{t.charts}</dt>
					<dd>
						<ul className="sf-charts">
							{files.charts.map((g) => (
								<li key={g.id}>
									<span className="sf-version">
										{treeName(g.tree, g.rev, g.versions)}
									</span>
									<ul className="sf-levels">
										{g.levels.map((l) => {
											const base = l.rank.split("_")[0] ?? l.rank;
											return (
												<li key={l.rank}>
													<span className={`chart-level chart-level-${base}`}>
														{l.rank.replaceAll("_", " ")}
													</span>
													{l.json ? (
														<Save file={l.json} label={t.json} />
													) : null}
													{l.pack ? (
														<Save file={l.pack} label={t.pack} />
													) : null}
												</li>
											);
										})}
									</ul>
								</li>
							))}
						</ul>
						<p className="field-hint">{t.chartsHint}</p>
					</dd>
				</div>
			) : null}
		</>
	);
}
