"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SteadyButton } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import {
	getRefreshUntil,
	persistCardReload,
	persistCooldown,
	subscribeSaveRefresh,
} from "@/lib/save-refresh";

function storedUntilSnapshot(): number {
	return getRefreshUntil();
}

function storedUntilServer(): number {
	return 0;
}

export function RefreshButton({ cooldownMs }: { cooldownMs: number }) {
	const { m } = useI18n();
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState<string>();
	const [now, setNow] = useState(0);
	const [prevCooldown, setPrevCooldown] = useState<number | null>(null);
	const [serverUntil, setServerUntil] = useState(0);
	const storedUntil = useSyncExternalStore(
		subscribeSaveRefresh,
		storedUntilSnapshot,
		storedUntilServer,
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

	useEffect(() => {
		return () => window.clearTimeout(hideError.current);
	}, []);

	const wait = m.refresh.wait.replaceAll(
		"{seconds}",
		String(Math.max(1, Math.ceil(remaining / 1000))),
	);
	const waitWide = m.refresh.wait.replaceAll("{seconds}", "120");
	const live = pending ? m.refresh.pending : cooling ? wait : m.refresh.save;

	function showError(text: string) {
		setMessage(text);
		window.clearTimeout(hideError.current);
		hideError.current = window.setTimeout(() => setMessage(undefined), 4000);
	}

	async function onRefresh() {
		if (pending || cooling) return;
		setPending(true);
		setMessage(undefined);
		try {
			const res = await fetch("/api/refresh", { method: "POST" });
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				lastSynced?: string;
			};
			if (!res.ok) {
				if (res.status === 429) persistCooldown();
				showError(data.error || m.refresh.failed);
				return;
			}
			persistCardReload(data.lastSynced);
			window.setTimeout(() => router.refresh(), 0);
		} catch {
			showError(m.refresh.failed);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="tool">
			<SteadyButton
				className="btn-ghost"
				type="button"
				disabled={pending || cooling}
				labels={[m.refresh.save, m.refresh.pending, waitWide]}
				onClick={() => void onRefresh()}
			>
				{live}
			</SteadyButton>
			{message ? (
				<p className="tool-pop tool-pop-alert" role="alert">
					{message}
				</p>
			) : null}
		</div>
	);
}
