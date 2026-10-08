"use client";

import {
	ArrowClockwise,
	ArrowsOut,
	WarningCircle,
} from "@phosphor-icons/react";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { CardLightbox } from "@/components/CardLightbox";
import type { CardSize } from "@/components/card-shape";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { loadCardBlob, peekCardBlob } from "@/lib/card-fetch";
import type { CardStats } from "@/lib/card-stats";
import {
	cardFetchUrl,
	getBustEpoch,
	getReloadToken,
	subscribeSaveRefresh,
} from "@/lib/save-refresh";
import type { CardMissing, CardPhase } from "@/phi/lib/external";

function reloadSnapshot(): string {
	return getReloadToken();
}

function reloadServerSnapshot() {
	return "";
}

const noSubscribe = () => () => {};

const SETTLE_MS = 350;

const SIZES_KEY = "phi.web.cardSizes";

function readSizes(): Record<string, CardSize> {
	try {
		const raw = JSON.parse(localStorage.getItem(SIZES_KEY) || "{}");
		return raw && typeof raw === "object" ? raw : {};
	} catch {
		return {};
	}
}

function rememberSize(key: string, size: CardSize) {
	try {
		const all = readSizes();
		const prev = all[key];
		if (prev && prev[0] === size[0] && prev[1] === size[1]) return;
		all[key] = size;
		localStorage.setItem(SIZES_KEY, JSON.stringify(all));
	} catch {}
}

async function ownCopy(url: string): Promise<string | undefined> {
	if (!url.startsWith("blob:")) return;
	try {
		const blob = await (await fetch(url)).blob();
		return URL.createObjectURL(blob);
	} catch {
		return;
	}
}

export type CardView = { url: string; width?: number; height?: number };

type Shown = {
	url: string;
	from: string;
	owned: boolean;
	width?: number;
	height?: number;
};

export function CardViewer({
	src,
	alt,
	name,
	sizeKey,
	defaultSize,
	hold = false,
	onStats,
	onFile,
	onView,
	zoomRequest = 0,
}: {
	src: string;
	alt: string;
	name: string;
	sizeKey: string;
	defaultSize: CardSize;
	hold?: boolean;
	onStats?: (stats: CardStats | undefined) => void;
	onFile?: (url: string | undefined) => void;
	onView?: (view: CardView | undefined) => void;
	zoomRequest?: number;
}) {
	const { locale, m } = useI18n();
	const reload = useSyncExternalStore(
		subscribeSaveRefresh,
		reloadSnapshot,
		reloadServerSnapshot,
	);
	const client = useSyncExternalStore(
		noSubscribe,
		() => true,
		() => false,
	);
	const fetchSrc = cardFetchUrl(src, {
		locale,
		epoch: getBustEpoch() || undefined,
	});
	const [attempt, setAttempt] = useState(0);
	const [shown, setShown] = useState<Shown>();
	const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
	const [error, setError] = useState<string>();
	const [startedAt, setStartedAt] = useState(0);
	const [waitingOn, setWaitingOn] = useState<CardPhase>();
	const [missing, setMissing] = useState<CardMissing[]>([]);
	const [now, setNow] = useState(0);
	const [announce, setAnnounce] = useState("");
	const [zoomed, setZoomed] = useState(false);
	const frame = useRef<HTMLDivElement>(null);
	const opener = useRef<HTMLElement | null>(null);
	const openZoom = () => {
		const at = document.activeElement;
		opener.current =
			at instanceof HTMLElement && at !== document.body ? at : null;
		setZoomed(true);
	};
	const live = useRef({ onStats, onFile, onView, m, name, shown });
	live.current = { onStats, onFile, onView, m, name, shown };
	useEffect(() => {
		live.current.onView?.(
			shown
				? { url: shown.url, width: shown.width, height: shown.height }
				: undefined,
		);
	}, [shown]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new request opens it
	useEffect(() => {
		if (zoomRequest > 0 && live.current.shown) openZoom();
	}, [zoomRequest]);
	const shownStats = useRef<CardStats | undefined>(undefined);
	const started = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `reload` and `attempt` re-run the load for the same URL
	useEffect(() => {
		let dead = false;
		let timer: number | undefined;
		const done = async (out: { url: string; stats?: CardStats }) => {
			const same = live.current.shown?.from === out.url;
			const own = same ? undefined : await ownCopy(out.url);
			if (dead) {
				if (own) URL.revokeObjectURL(own);
				return;
			}
			const t = live.current;
			const url = same && t.shown ? t.shown.url : (own ?? out.url);
			if (!same) setShown({ url, from: out.url, owned: Boolean(own) });
			setPhase("ready");
			setError(undefined);
			setMissing(out.stats?.missing ?? []);
			setAnnounce(t.m.card.ready.replaceAll("{name}", t.name));
			shownStats.current = out.stats;
			t.onStats?.(out.stats);
			t.onFile?.(url);
		};
		const onPhase = (next: CardPhase) => {
			if (dead) return;
			setWaitingOn(next);
			if (next === "phib19") setAnnounce(live.current.m.card.waitingPhib19);
		};
		const load = () =>
			loadCardBlob(fetchSrc, onPhase)
				.then((out) => {
					if (!dead) void done(out);
				})
				.catch((err: unknown) => {
					if (dead) return;
					const t = live.current;
					const msg = t.m.card;
					const fail = err instanceof Error ? err : new Error("network");
					setError(
						fail.name === "http"
							? fail.message || msg.renderFailed
							: fail.name === "abort"
								? msg.renderFailed
								: msg.unreachable,
					);
					setPhase("error");
					setAnnounce("");
					if (t.shown) {
						t.onStats?.(shownStats.current);
						t.onFile?.(t.shown.url);
					}
				});
		const hit = hold ? undefined : peekCardBlob(fetchSrc);
		if (hit) {
			void done(hit);
		} else if (hold) {
			setPhase("loading");
		} else {
			const t = live.current;
			setPhase("loading");
			setError(undefined);
			setWaitingOn(undefined);
			setStartedAt(Date.now());
			setAnnounce(t.m.card.rendering);
			t.onStats?.(undefined);
			t.onFile?.(undefined);
			if (started.current) timer = window.setTimeout(load, SETTLE_MS);
			else void load();
			started.current = true;
		}
		return () => {
			dead = true;
			window.clearTimeout(timer);
		};
	}, [fetchSrc, reload, attempt, hold]);

	const owned = useRef<string | undefined>(undefined);
	useEffect(() => {
		const prev = owned.current;
		owned.current = shown?.owned ? shown.url : undefined;
		if (prev && prev !== owned.current) URL.revokeObjectURL(prev);
	}, [shown]);
	const mounted = useRef(false);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			const url = owned.current;
			if (!url) return;
			window.setTimeout(() => {
				if (!mounted.current) URL.revokeObjectURL(url);
			}, 0);
		};
	}, []);

	useEffect(() => {
		if (phase !== "loading") return;
		const tick = () => setNow(Date.now());
		tick();
		const id = window.setInterval(tick, 1000);
		return () => window.clearInterval(id);
	}, [phase]);

	const loading = phase === "loading";
	const seconds =
		loading && startedAt
			? Math.max(0, Math.floor((now - startedAt) / 1000))
			: 0;
	const known = useMemo(
		() => (client ? readSizes()[sizeKey] : undefined),
		[client, sizeKey],
	);
	const [w, h] = known ?? defaultSize;
	const ratio = shown || phase === "error" ? undefined : `${w} / ${h}`;
	const tall =
		shown?.width && shown.height ? shown.height / shown.width > 3 : h / w > 3;
	const retry = () => {
		frame.current?.focus({ preventScroll: true });
		setAttempt((n) => n + 1);
	};

	const status = loading ? (
		<div className="frame-status">
			<span className="frame-spinner" aria-hidden="true" />
			<span>
				{waitingOn === "phib19" ? m.card.waitingPhib19 : m.card.rendering}
			</span>
			{seconds >= 1 ? (
				<span className="frame-elapsed">
					{m.card.elapsed.replaceAll("{seconds}", String(seconds))}
				</span>
			) : null}
			{seconds >= 10 ? <span className="frame-slow">{m.card.slow}</span> : null}
		</div>
	) : null;

	const gaps = missing.filter(
		(part): part is Exclude<CardMissing, "stale" | "empty"> =>
			part !== "stale" && part !== "empty",
	);
	const missingText = [
		gaps.length
			? m.card.missingData.replaceAll(
					"{list}",
					gaps
						.map((part) => m.card.missingParts[part])
						.join(m.card.missingJoin),
				)
			: missing.includes("stale")
				? m.card.staleData
				: "",
		missing.includes("empty") ? m.card.emptyData : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className="card-view" data-tall={tall || undefined}>
			{phase === "ready" && missingText ? (
				<div className="card-alert card-missing">
					<WarningCircle aria-hidden="true" size={20} />
					<p role="status">{missingText}</p>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={retry}
					>
						<ArrowClockwise aria-hidden="true" size={16} />
						{m.card.retry}
					</button>
				</div>
			) : null}
			{phase === "error" && shown ? (
				<div className="card-alert">
					<WarningCircle aria-hidden="true" size={20} />
					<p role="alert">
						{m.card.failed
							.replaceAll("{name}", name)
							.replaceAll("{error}", error ?? "")}
					</p>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={retry}
					>
						<ArrowClockwise aria-hidden="true" size={16} />
						{m.card.retry}
					</button>
				</div>
			) : null}
			<div
				ref={frame}
				className="frame"
				tabIndex={-1}
				aria-busy={loading}
				data-phase={phase}
				style={ratio ? { aspectRatio: ratio } : undefined}
			>
				{shown ? (
					// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: the toolbar button does the same with the keyboard
					<div className="frame-zoom" tabIndex={-1} onClick={openZoom}>
						<img
							src={shown.url}
							alt={alt}
							onLoad={(e) => {
								const img = e.currentTarget;
								if (!img.naturalWidth) return;
								const size: CardSize = [img.naturalWidth, img.naturalHeight];
								const url = shown.url;
								rememberSize(sizeKey, size);
								setShown((prev) =>
									prev?.url === url
										? { ...prev, width: size[0], height: size[1] }
										: prev,
								);
							}}
						/>
						<span className="frame-zoom-hint" aria-hidden="true">
							<ArrowsOut size={16} />
							{m.card.zoom}
						</span>
					</div>
				) : phase === "error" ? (
					<div className="frame-error">
						<WarningCircle aria-hidden="true" size={28} />
						<div role="alert">
							<p className="frame-error-title">{m.card.renderFailed}</p>
							{error && error !== m.card.renderFailed ? (
								<p className="frame-error-detail">{error}</p>
							) : null}
						</div>
						<button type="button" className="btn btn-ghost" onClick={retry}>
							<ArrowClockwise aria-hidden="true" size={18} />
							{m.card.retry}
						</button>
					</div>
				) : null}
				{status}
			</div>
			<Announce>{announce}</Announce>
			{zoomed && shown ? (
				<CardLightbox
					url={shown.url}
					alt={alt}
					title={name}
					width={shown.width}
					height={shown.height}
					onClose={() => {
						setZoomed(false);
						const back = opener.current?.isConnected
							? opener.current
							: frame.current;
						back?.focus({ preventScroll: true });
					}}
				/>
			) : null}
		</div>
	);
}
