"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SteadyButton } from "@/components/Tool";
import { useActionCooldown } from "@/components/useActionCooldown";
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
	const [pending, setPending] = useState(false);
	const { remaining, cooling, message, showError } = useActionCooldown(
		cooldownMs,
		getBypassUntil,
	);

	const wait = m.refresh.wait.replaceAll(
		"{seconds}",
		String(Math.max(1, Math.ceil(remaining / 1000))),
	);
	const waitWide = m.refresh.wait.replaceAll("{seconds}", "300");
	const live = pending
		? m.refresh.bypassPending
		: cooling
			? wait
			: m.refresh.bypass;

	async function onBypass() {
		if (pending || cooling) return;
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
		<div className="tool">
			<SteadyButton
				className="btn-ghost"
				type="button"
				disabled={pending || cooling}
				labels={[m.refresh.bypass, m.refresh.bypassPending, waitWide]}
				onClick={() => void onBypass()}
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
