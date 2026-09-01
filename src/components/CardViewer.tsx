"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/provider";
import {
	CARD_RELOAD_KEY,
	SAVE_REFRESHED_EVENT,
	withCardReload,
} from "@/lib/save-refresh";

function subscribeSaveRefresh(onStoreChange: () => void) {
	window.addEventListener(SAVE_REFRESHED_EVENT, onStoreChange);
	return () => window.removeEventListener(SAVE_REFRESHED_EVENT, onStoreChange);
}

function reloadSnapshot(): string {
	return sessionStorage.getItem(CARD_RELOAD_KEY) || "";
}

function reloadServerSnapshot(): string {
	return "";
}

export function CardViewer({ src, alt }: { src: string; alt: string }) {
	const reload = useSyncExternalStore(
		subscribeSaveRefresh,
		reloadSnapshot,
		reloadServerSnapshot,
	);
	const fetchSrc = withCardReload(src, reload);
	return <CardFrame key={fetchSrc} src={fetchSrc} alt={alt} />;
}

function CardFrame({ src, alt }: { src: string; alt: string }) {
	const { locale, m } = useI18n();
	const [state, setState] = useState<"loading" | "ok" | "err">("loading");
	const [url, setUrl] = useState<string>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		let dead = false;
		let objectUrl: string | undefined;
		const ctrl = new AbortController();
		const timer = window.setTimeout(() => ctrl.abort(), 55_000);
		fetch(src, {
			cache: "no-store",
			signal: ctrl.signal,
			headers: { "Accept-Language": locale === "zh" ? "zh-CN,zh;q=0.9" : "en" },
		})
			.then(async (res) => {
				if (!res.ok) {
					const data = (await res
						.json()
						.catch(() => ({ error: res.statusText }))) as { error?: string };
					if (!dead) {
						setError(data.error || m.card.renderFailed);
						setState("err");
					}
					return;
				}
				const blob = await res.blob();
				objectUrl = URL.createObjectURL(blob);
				if (!dead) {
					setUrl(objectUrl);
					setState("ok");
				}
			})
			.catch((err: unknown) => {
				if (!dead) {
					const aborted =
						err instanceof DOMException && err.name === "AbortError";
					setError(aborted ? m.card.renderFailed : m.card.unreachable);
					setState("err");
				}
			})
			.finally(() => window.clearTimeout(timer));
		return () => {
			dead = true;
			ctrl.abort();
			window.clearTimeout(timer);
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [src, locale, m.card.renderFailed, m.card.unreachable]);

	return (
		<div className="frame" aria-busy={state === "loading"}>
			{state === "loading" ? (
				<div className="placeholder">{m.card.rendering}</div>
			) : null}
			{state === "err" ? <div className="error">{error}</div> : null}
			{state === "ok" && url ? <img src={url} alt={alt} /> : null}
		</div>
	);
}
