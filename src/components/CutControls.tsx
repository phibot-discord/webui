"use client";

import {
	ArrowCounterClockwise,
	CornersIn,
	CornersOut,
	Play,
	SpeakerHigh,
	SpeakerSlash,
} from "@phosphor-icons/react";
import {
	type ReactNode,
	type Ref,
	type RefObject,
	useEffect,
	useState,
} from "react";
import type { Messages } from "@/i18n/messages";
import {
	COLLECTION_LANG_NAMES,
	COLLECTION_LANGS,
	type CollectionLang,
} from "@/lib/collection";
import { fill } from "@/phi/lib/card-i18n";

type CutMessages = Messages["c9s6"];

export function makeSound(src: string, volume = 1, loop = false) {
	const el = new Audio(src);
	el.preload = "auto";
	el.volume = volume;
	el.loop = loop;
	return el;
}

export function replay(el: HTMLAudioElement | undefined) {
	if (!el) return;
	el.currentTime = 0;
	el.play().catch(() => undefined);
}

export function useFullscreen(player: RefObject<HTMLElement | null>) {
	const [canFull, setCanFull] = useState(false);
	const [full, setFull] = useState(false);
	useEffect(() => {
		setCanFull(Boolean(document.fullscreenEnabled));
		const sync = () =>
			setFull(
				Boolean(player.current) &&
					document.fullscreenElement === player.current,
			);
		document.addEventListener("fullscreenchange", sync);
		return () => document.removeEventListener("fullscreenchange", sync);
	}, [player]);
	const toggleFull = () => {
		if (document.fullscreenElement) {
			document.exitFullscreen().catch(() => undefined);
			return;
		}
		player.current?.requestFullscreen().catch(() => undefined);
	};
	return { canFull, full, toggleFull };
}

export function CutLangSelect({
	id,
	t,
	lang,
	onChange,
}: {
	id: string;
	t: CutMessages;
	lang: CollectionLang;
	onChange: (lang: CollectionLang) => void;
}) {
	return (
		<div className="field cut-lang">
			<label htmlFor={id}>{t.language}</label>
			<select
				id={id}
				value={lang}
				onChange={(event) =>
					onChange(event.currentTarget.value as CollectionLang)
				}
			>
				{COLLECTION_LANGS.map((code) => (
					<option key={code} value={code} lang={code}>
						{COLLECTION_LANG_NAMES[code]}
					</option>
				))}
			</select>
		</div>
	);
}

export function CutToggles({
	t,
	soundOn,
	onSound,
	fullscreen,
}: {
	t: CutMessages;
	soundOn: boolean;
	onSound?: () => void;
	fullscreen: ReturnType<typeof useFullscreen>;
}) {
	const { canFull, full, toggleFull } = fullscreen;
	if (!onSound && !canFull) return null;
	return (
		<div className="cut-toggles">
			{onSound ? (
				<button
					type="button"
					className="btn btn-ghost"
					aria-pressed={soundOn}
					onClick={onSound}
				>
					{soundOn ? (
						<SpeakerHigh size={18} aria-hidden />
					) : (
						<SpeakerSlash size={18} aria-hidden />
					)}
					{t.sound}
				</button>
			) : null}
			{canFull ? (
				<button
					type="button"
					className="btn btn-ghost btn-icon"
					aria-label={full ? t.exitFullscreen : t.fullscreen}
					title={full ? t.exitFullscreen : t.fullscreen}
					onClick={toggleFull}
				>
					{full ? (
						<CornersIn size={18} aria-hidden />
					) : (
						<CornersOut size={18} aria-hidden />
					)}
				</button>
			) : null}
		</div>
	);
}

export function CutStart({
	t,
	onPlay,
	note,
}: {
	t: CutMessages;
	onPlay: () => void;
	note?: ReactNode;
}) {
	return (
		<div className="cut-cover">
			<button
				type="button"
				className="btn btn-primary cut-cover-btn"
				onClick={onPlay}
			>
				<Play size={18} weight="fill" aria-hidden />
				{t.play}
			</button>
			{note ? <p>{note}</p> : null}
		</div>
	);
}

export function CutEnd({
	t,
	onReplay,
	buttonRef,
}: {
	t: CutMessages;
	onReplay: () => void;
	buttonRef?: Ref<HTMLButtonElement>;
}) {
	return (
		<div className="cut-cover">
			<p>{t.ended}</p>
			<button
				ref={buttonRef}
				type="button"
				className="btn btn-primary cut-cover-btn"
				onClick={onReplay}
			>
				<ArrowCounterClockwise size={18} weight="bold" aria-hidden />
				{t.replay}
			</button>
		</div>
	);
}

export function CutCount({
	t,
	page,
	total,
}: {
	t: CutMessages;
	page: number;
	total: number;
}) {
	return (
		<span className="cut-count">
			<span className="sr-only">{fill(t.pageOf, { n: page + 1, total })}</span>
			<span aria-hidden="true">
				{page + 1} / {total}
			</span>
		</span>
	);
}

export function CutRestart({
	t,
	disabled,
	onRestart,
}: {
	t: CutMessages;
	disabled: boolean;
	onRestart: () => void;
}) {
	return (
		<button
			type="button"
			className="btn btn-quiet btn-icon"
			aria-label={t.restart}
			title={t.restart}
			disabled={disabled}
			onClick={onRestart}
		>
			<ArrowCounterClockwise size={18} aria-hidden />
		</button>
	);
}
