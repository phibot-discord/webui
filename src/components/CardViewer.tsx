"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/provider";
import { loadCardBlob, peekCardBlob } from "@/lib/card-fetch";
import type { CardStats } from "@/lib/card-stats";
import {
	cardFetchUrl,
	getBustEpoch,
	getReloadToken,
	subscribeSaveRefresh,
} from "@/lib/save-refresh";

function reloadSnapshot(): string {
	return getReloadToken();
}

function reloadServerSnapshot() {
	return "";
}

export function CardViewer({
	src,
	alt,
	onStats,
	onFile,
}: {
	src: string;
	alt: string;
	onStats?: (stats: CardStats | undefined) => void;
	onFile?: (url: string | undefined) => void;
}) {
	const { locale } = useI18n();
	const reload = useSyncExternalStore(
		subscribeSaveRefresh,
		reloadSnapshot,
		reloadServerSnapshot,
	);
	const fetchSrc = cardFetchUrl(src, {
		locale,
		epoch: getBustEpoch() || undefined,
	});
	return (
		<CardFrame
			key={`${fetchSrc}:${reload}`}
			src={fetchSrc}
			alt={alt}
			onStats={onStats}
			onFile={onFile}
		/>
	);
}

function CardFrame({
	src,
	alt,
	onStats,
	onFile,
}: {
	src: string;
	alt: string;
	onStats?: (stats: CardStats | undefined) => void;
	onFile?: (url: string | undefined) => void;
}) {
	const { m } = useI18n();
	const [loading, setLoading] = useState(true);
	const [url, setUrl] = useState<string>();
	const [error, setError] = useState<string>();
	const onStatsRef = useRef(onStats);
	const onFileRef = useRef(onFile);
	onStatsRef.current = onStats;
	onFileRef.current = onFile;

	useEffect(() => {
		let dead = false;
		const hit = peekCardBlob(src);
		if (hit) {
			setUrl(hit.url);
			setLoading(false);
			setError(undefined);
			onStatsRef.current?.(hit.stats);
			onFileRef.current?.(hit.url);
			return;
		}
		setLoading(true);
		setError(undefined);
		onStatsRef.current?.(undefined);
		onFileRef.current?.(undefined);
		void loadCardBlob(src)
			.then((out) => {
				if (dead) return;
				setUrl(out.url);
				setLoading(false);
				onStatsRef.current?.(out.stats);
				onFileRef.current?.(out.url);
			})
			.catch((err: unknown) => {
				if (dead) return;
				const fail = err instanceof Error ? err : new Error("network");
				setError(
					fail.name === "http"
						? fail.message || m.card.renderFailed
						: fail.name === "abort"
							? m.card.renderFailed
							: m.card.unreachable,
				);
				setLoading(false);
			});
		return () => {
			dead = true;
		};
	}, [src, m.card.renderFailed, m.card.unreachable]);

	return (
		<div className="frame" aria-busy={loading}>
			{!url && loading ? (
				<div className="placeholder">{m.card.rendering}</div>
			) : null}
			{error && !url ? <div className="error">{error}</div> : null}
			{url ? <img src={url} alt={alt} /> : null}
		</div>
	);
}
