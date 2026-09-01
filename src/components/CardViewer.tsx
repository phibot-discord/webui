"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/provider";
import {
	getReloadToken,
	subscribeSaveRefresh,
	withCardReload,
} from "@/lib/save-refresh";

function reloadSnapshot(): string {
	return getReloadToken();
}

function reloadServerSnapshot(): string {
	return "";
}

function withLocale(src: string, locale: string) {
	const u = new URL(src, "http://local.invalid");
	u.searchParams.set("locale", locale);
	return `${u.pathname}${u.search}`;
}

export function CardViewer({ src, alt }: { src: string; alt: string }) {
	const { locale } = useI18n();
	const reload = useSyncExternalStore(
		subscribeSaveRefresh,
		reloadSnapshot,
		reloadServerSnapshot,
	);
	const fetchSrc = withLocale(withCardReload(src, reload), locale);
	return <CardFrame key={reload || "card"} src={fetchSrc} alt={alt} />;
}

function CardFrame({ src, alt }: { src: string; alt: string }) {
	const { m } = useI18n();
	const [loading, setLoading] = useState(true);
	const [url, setUrl] = useState<string>();
	const [error, setError] = useState<string>();
	const shown = useRef<string | undefined>(undefined);

	useEffect(() => {
		let dead = false;
		let objectUrl: string | undefined;
		const ctrl = new AbortController();
		const timer = window.setTimeout(() => ctrl.abort(), 55_000);
		setLoading(true);
		setError(undefined);
		fetch(src, { cache: "reload", signal: ctrl.signal })
			.then(async (res) => {
				if (!res.ok) {
					const data = (await res
						.json()
						.catch(() => ({ error: res.statusText }))) as { error?: string };
					if (!dead) {
						setError(data.error || m.card.renderFailed);
						setLoading(false);
					}
					return;
				}
				const blob = await res.blob();
				objectUrl = URL.createObjectURL(blob);
				if (dead) {
					URL.revokeObjectURL(objectUrl);
					return;
				}
				if (shown.current) URL.revokeObjectURL(shown.current);
				shown.current = objectUrl;
				setUrl(objectUrl);
				setLoading(false);
			})
			.catch((err: unknown) => {
				if (!dead) {
					const aborted =
						err instanceof DOMException && err.name === "AbortError";
					setError(aborted ? m.card.renderFailed : m.card.unreachable);
					setLoading(false);
				}
			})
			.finally(() => window.clearTimeout(timer));
		return () => {
			dead = true;
			ctrl.abort();
			window.clearTimeout(timer);
		};
	}, [src, m.card.renderFailed, m.card.unreachable]);

	useEffect(() => {
		return () => {
			if (shown.current) URL.revokeObjectURL(shown.current);
		};
	}, []);

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
