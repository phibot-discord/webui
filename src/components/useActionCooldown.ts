"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { subscribeSaveRefresh } from "@/lib/save-refresh";

/** Cooldown countdown plus the action's error, kept until cleared (WCAG 2.2.1) */
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

	if (prevCooldown !== cooldownMs) {
		setPrevCooldown(cooldownMs);
		if (cooldownMs > 0)
			setServerUntil((t) => Math.max(t, Date.now() + cooldownMs));
	}

	const until = Math.max(serverUntil, storedUntil);
	const remaining = now ? Math.max(0, until - now) : Math.max(0, cooldownMs);
	const cooling = remaining > 0;

	// Tick only while a cooldown is running; idle buttons do not re-render 4×/s
	useEffect(() => {
		const tick = () => setNow(Date.now());
		queueMicrotask(tick);
		if (!cooling) return;
		const id = window.setInterval(tick, 250);
		return () => window.clearInterval(id);
	}, [cooling]);

	return {
		remaining,
		cooling,
		message,
		showError: (text: string) => setMessage(text),
		clearError: () => setMessage(undefined),
	};
}

/** Whole seconds left, never 0 while still cooling */
export function cooldownSeconds(remaining: number) {
	return String(Math.max(1, Math.ceil(remaining / 1000)));
}
