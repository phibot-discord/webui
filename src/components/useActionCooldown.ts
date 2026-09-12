"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribeSaveRefresh } from "@/lib/save-refresh";

export function useActionCooldown(
	cooldownMs: number,
	getStoredUntil: () => number,
) {
	const [now, setNow] = useState(0);
	const [prevCooldown, setPrevCooldown] = useState<number | null>(null);
	const [serverUntil, setServerUntil] = useState(0);
	const [message, setMessage] = useState<string>();
	const storedUntil = useSyncExternalStore(
		subscribeSaveRefresh,
		getStoredUntil,
		() => 0,
	);
	const hideError = useRef<number | undefined>(undefined);

	if (prevCooldown !== cooldownMs) {
		setPrevCooldown(cooldownMs);
		if (cooldownMs > 0)
			setServerUntil((t) => Math.max(t, Date.now() + cooldownMs));
	}

	const until = Math.max(serverUntil, storedUntil);
	const remaining = now ? Math.max(0, until - now) : Math.max(0, cooldownMs);
	const cooling = remaining > 0;

	useEffect(() => {
		const tick = () => setNow(Date.now());
		const id = window.setInterval(tick, 250);
		queueMicrotask(tick);
		return () => window.clearInterval(id);
	}, []);

	useEffect(() => () => window.clearTimeout(hideError.current), []);

	function showError(text: string) {
		setMessage(text);
		window.clearTimeout(hideError.current);
		hideError.current = window.setTimeout(() => setMessage(undefined), 4000);
	}

	return { remaining, cooling, message, showError };
}
