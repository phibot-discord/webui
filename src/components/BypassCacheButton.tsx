"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { SteadyButton } from "@/components/Tool";
import {
	cooldownSeconds,
	useActionCooldown,
} from "@/components/useActionCooldown";
import { useI18n } from "@/i18n/provider";
import {
	cooldownMsFromServer,
	getBypassUntil,
	persistBustEpoch,
	persistBypassCooldown,
	persistCardReload,
} from "@/lib/save-refresh";

export function BypassCacheButton({ cooldownMs }: { cooldownMs: number }) {
	const { m } = useI18n();
	const router = useRouter();
	const hintId = useId();
	const [pending, setPending] = useState(false);
	const { remaining, cooling, message, showError, clearError } =
		useActionCooldown(cooldownMs, getBypassUntil);

	const wait = m.refresh.wait.replaceAll(
		"{seconds}",
		cooldownSeconds(remaining),
	);
	const waitWide = m.refresh.wait.replaceAll("{seconds}", "300");
	const live = pending
		? m.refresh.bypassPending
		: cooling
			? wait
			: m.refresh.bypass;

	async function onBypass() {
		if (pending || cooling) return;
		clearError();
		setPending(true);
		try {
			const res = await fetch("/api/cache/bypass", { method: "POST" });
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				code?: string;
				ok?: boolean;
				epoch?: string;
				cooldownMs?: number;
				retryAfter?: number;
			};
			if (!res.ok || data.ok !== true) {
				if (res.status === 429 || data.code === "cache_bypass_cooldown") {
					persistBypassCooldown(cooldownMsFromServer(data, res.headers));
				}
				showError(data.error || m.refresh.bypassFailed);
				return;
			}
			if (data.epoch) persistBustEpoch(data.epoch);
			persistCardReload();
			persistBypassCooldown(cooldownMsFromServer(data, res.headers));
			window.setTimeout(() => router.refresh(), 0);
		} catch {
			showError(m.refresh.bypassFailed);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="menu-item">
			<SteadyButton
				className="btn-ghost menu-btn"
				type="button"
				aria-disabled={pending || cooling || undefined}
				aria-busy={pending || undefined}
				aria-describedby={hintId}
				labels={[m.refresh.bypass, m.refresh.bypassPending, waitWide]}
				onClick={() => void onBypass()}
			>
				{live}
			</SteadyButton>
			<p className="menu-hint" id={hintId}>
				{m.refresh.bypassHint}
			</p>
			{message ? (
				<p className="field-error" role="alert">
					{message}
				</p>
			) : null}
		</div>
	);
}
