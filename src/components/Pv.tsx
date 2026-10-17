"use client";

import {
	ArrowUp,
	DownloadSimple,
	SpeakerHigh,
	Subtitles,
	WarningCircle,
} from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import type { Messages } from "@/i18n/messages";
import { parseCollectionLang } from "@/lib/collection";
import { pvHref } from "@/lib/files-view";
import { readLocal, writeLocal } from "@/lib/local-store";
import type { OverlayKind } from "@/lib/pv";
import { prefersReducedMotion } from "@/lib/scroll";
import type { DeductionView } from "./Deduction";
import { LangName } from "./LangName";
import { RevealCurrent } from "./RevealCurrent";
import { type SegOption, SegRadio } from "./SegRadio";

const Deduction = dynamic(
	() => import("./Deduction").then((mod) => mod.Deduction),
	{ ssr: false },
);

const OVERLAY_KEY = "phi.web.pv.overlay";

function readOverlayPref(): boolean {
	return readLocal(OVERLAY_KEY) === "1";
}

function writeOverlayPref(on: boolean) {
	writeLocal(OVERLAY_KEY, on ? "1" : "0");
}

export type PlayerClip = {
	id: string;
	title: string;
	duration: string;
	detail: string;
	audio: boolean;
	url: string;
	available: boolean;
	overlay?: ClipOverlay;
	transcript?: string;
	replay?: DeductionView;
};

export type ClipVersion = { key?: string; url: string; filename: string };

export type ClipOverlay = {
	kind: OverlayKind;
	versions: ClipVersion[];
	fixed?: boolean;
};

export type PlayerGroup = {
	id: string;
	label: string;
	name: string;
	clips: PlayerClip[];
};

type PvCopy = Pick<Messages, "pv" | "deduction" | "c9s6">;

function replaceUrl(href: string) {
	try {
		history.replaceState(null, "", href);
	} catch {
		return;
	}
}

export function Pv({
	groups,
	initial,
	t,
}: {
	groups: PlayerGroup[];
	initial?: string;
	t: PvCopy;
}) {
	const stage = useRef<HTMLDivElement>(null);
	const playable = groups.flatMap((g) => g.clips).filter((c) => c.available);
	const [pickedId, setPickedId] = useState(
		(playable.find((c) => c.id === initial) ?? playable[0])?.id,
	);
	const [chosen, setChosen] = useState(false);
	const [failed, setFailed] = useState(false);
	const clip = playable.find((c) => c.id === pickedId);

	const pick = useCallback((next: PlayerClip) => {
		setPickedId(next.id);
		setChosen(true);
		setFailed(false);
		replaceUrl(pvHref(next.id));
	}, []);

	const fail = useCallback(() => setFailed(true), []);

	if (!clip) return null;
	return (
		<div className="pv-layout">
			<PvStage
				m={t}
				clip={clip}
				chosen={chosen}
				failed={failed}
				stage={stage}
				fail={fail}
			/>
			<PvList t={t.pv} groups={groups} clip={clip} pick={pick} />
		</div>
	);
}

function pickVersion(
	overlay: ClipOverlay,
	key: string | undefined,
): ClipVersion | undefined {
	const { versions } = overlay;
	const own = versions.find((v) => v.key === key);
	if (overlay.kind === "level") {
		return own ?? versions.find((v) => v.key === "IN") ?? versions.at(-1);
	}
	return own ?? versions[0];
}

function keyLabel(kind: OverlayKind, key: string): ReactNode {
	const lang = kind === "lang" ? parseCollectionLang(key) : undefined;
	return lang ? <LangName lang={lang} /> : key;
}

function BackToPlayer({
	screen,
	stage,
	label,
}: {
	screen: RefObject<HTMLDivElement | null>;
	stage: RefObject<HTMLDivElement | null>;
	label: string;
}) {
	const [away, setAway] = useState(false);
	useEffect(() => {
		const node = screen.current;
		if (!node || typeof IntersectionObserver === "undefined") return;
		const nav = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
		);
		const watch = new IntersectionObserver(
			([entry]) => setAway(entry ? !entry.isIntersecting : false),
			{ rootMargin: `-${Number.isFinite(nav) ? nav * 16 : 64}px 0px 0px 0px` },
		);
		watch.observe(node);
		return () => watch.disconnect();
	}, [screen]);
	if (!away) return null;
	return (
		<button
			type="button"
			className="btn btn-primary pv-back"
			onClick={() =>
				stage.current?.scrollIntoView({
					block: "start",
					behavior: prefersReducedMotion() ? "auto" : "smooth",
				})
			}
		>
			<ArrowUp size={16} weight="bold" aria-hidden />
			{label}
		</button>
	);
}

function PvStage({
	m,
	clip,
	chosen,
	failed,
	stage,
	fail,
}: {
	m: PvCopy;
	clip: PlayerClip;
	chosen: boolean;
	failed: boolean;
	stage: RefObject<HTMLDivElement | null>;
	fail: () => void;
}) {
	const t = m.pv;
	const video = useRef<HTMLVideoElement>(null);
	const screen = useRef<HTMLDivElement>(null);
	const resume = useRef<{ time: number; playing: boolean } | null>(null);
	const [overlayOn, setOverlayOn] = useState(false);
	const [picked, setPicked] = useState<Partial<Record<OverlayKind, string>>>(
		{},
	);
	const [mode, setMode] = useState<"video" | "interactive">("video");
	useEffect(() => setOverlayOn(readOverlayPref()), []);
	const overlay = clip.overlay;
	const fixed = overlay?.fixed === true;
	const interactive = Boolean(clip.replay) && mode === "interactive";
	const version =
		overlay && (overlayOn || fixed)
			? pickVersion(overlay, picked[overlay.kind])
			: undefined;
	const src = version?.url ?? clip.url;
	const keepPlace = () => {
		const player = video.current;
		resume.current = player
			? { time: player.currentTime, playing: !player.paused }
			: null;
	};
	const keys =
		overlay && overlay.versions.length > 1
			? overlay.versions.flatMap((v) => (v.key ? [v.key] : []))
			: undefined;
	const choices: SegOption<string>[] = [
		...(fixed ? [] : [{ value: "off", label: t.overlayOff }]),
		...(overlay && keys
			? keys.map((key) => ({
					value: key,
					label: keyLabel(overlay.kind, key),
					className:
						overlay.kind === "level" ? `seg-level seg-level-${key}` : undefined,
				}))
			: [{ value: "on", label: t.overlayOn }]),
	];
	const choice = !version ? "off" : keys ? (version.key ?? "off") : "on";
	const choose = (next: string) => {
		keepPlace();
		if (overlay && next !== "off" && next !== "on") {
			setPicked((was) => ({ ...was, [overlay.kind]: next }));
		}
		if (fixed) return;
		setOverlayOn(next !== "off");
		writeOverlayPref(next !== "off");
	};
	const note = fixed
		? undefined
		: keys && overlay?.kind === "level"
			? t.overlayLevel
			: keys && overlay?.kind === "lang"
				? t.overlayLang
				: undefined;
	return (
		<div className="pv-stage" ref={stage}>
			<div className="pv-screen" ref={screen}>
				{interactive && clip.replay ? (
					<Deduction view={clip.replay} t={m} />
				) : failed ? (
					<div className="pv-failed" role="alert">
						<WarningCircle size={20} weight="fill" aria-hidden />
						<p>{t.playFailed}</p>
					</div>
				) : (
					// biome-ignore lint/a11y/useMediaCaption: game video, there are no captions to offer
					<video
						key={src}
						ref={video}
						className="pv-video"
						src={src}
						aria-label={`${t.playerLabel}: ${clip.title}`}
						controls
						playsInline
						preload="metadata"
						autoPlay={chosen && !resume.current}
						onLoadedMetadata={(event) => {
							const place = resume.current;
							if (!place) return;
							resume.current = null;
							const player = event.currentTarget;
							player.currentTime = Math.min(place.time, player.duration || 0);
							if (place.playing) player.play().catch(() => undefined);
						}}
						onError={fail}
					/>
				)}
			</div>
			<div className="pv-now">
				<div className="pv-now-copy">
					<h2>{clip.title}</h2>
					<p>
						{clip.duration} · {clip.detail}
						{clip.audio ? "" : ` · ${t.noSound}`}
					</p>
				</div>
				<div className="pv-now-actions">
					{clip.transcript ? (
						<Link
							className="btn btn-ghost btn-sm"
							href={clip.transcript}
							prefetch={false}
						>
							{t.transcript}
							<Subtitles size={14} aria-hidden />
						</Link>
					) : null}
					<a
						className="btn btn-ghost btn-sm"
						href={src}
						download={version?.filename ?? `${clip.id}.mp4`}
						aria-label={`${t.download} · ${clip.title}`}
					>
						{t.download}
						<DownloadSimple size={14} aria-hidden />
					</a>
				</div>
			</div>
			{clip.replay ? (
				<SegRadio
					legend={m.deduction.mode}
					value={mode}
					options={[
						{ value: "video", label: m.deduction.video },
						{ value: "interactive", label: m.deduction.interactive },
					]}
					onChange={(next) =>
						setMode(next === "interactive" ? "interactive" : "video")
					}
					className="pv-replay"
				/>
			) : null}
			{overlay && !interactive ? (
				<SegRadio
					legend={fixed ? m.c9s6.language : t.overlay}
					value={choice}
					options={choices}
					onChange={choose}
					note={note}
					className="pv-overlay"
				/>
			) : null}
			<p className="sr-only" role="status" aria-live="polite">
				{chosen ? t.nowPlaying.replaceAll("{title}", clip.title) : ""}
			</p>
			<BackToPlayer screen={screen} stage={stage} label={t.backToPlayer} />
		</div>
	);
}

function PvList({
	t,
	groups,
	clip,
	pick,
}: {
	t: PvCopy["pv"];
	groups: PlayerGroup[];
	clip: PlayerClip;
	pick: (clip: PlayerClip) => void;
}) {
	const ids = useId();
	const titleId = `${ids}-title`;
	return (
		<nav className="pv-list" aria-labelledby={titleId}>
			<RevealCurrent current={clip.id} within=".pv-list" />
			<h2 id={titleId}>{t.listLabel}</h2>
			<div className="pv-groups">
				{groups.map((group) => {
					const headId = `${ids}-${group.id}`;
					return (
						<section key={group.id} aria-labelledby={headId}>
							<h3 id={headId}>
								{group.label ? (
									<span className="pv-group-label">{group.label}</span>
								) : null}
								{group.name}
							</h3>
							<ul>
								{group.clips.map((c) => {
									const current = c.id === clip.id;
									return (
										<li key={c.id}>
											<button
												type="button"
												className="pv-clip"
												aria-current={current ? "true" : undefined}
												disabled={!c.available}
												onClick={() => pick(c)}
											>
												<span className="pv-clip-mark" aria-hidden="true">
													{current ? (
														<SpeakerHigh size={16} weight="fill" />
													) : null}
												</span>
												<span className="pv-clip-title">{c.title}</span>
												{c.available ? (
													<span className="pv-clip-time">{c.duration}</span>
												) : (
													<span className="pv-clip-tag">{t.clipMissing}</span>
												)}
											</button>
										</li>
									);
								})}
							</ul>
						</section>
					);
				})}
			</div>
		</nav>
	);
}
