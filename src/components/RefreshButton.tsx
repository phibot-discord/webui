"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActionCooldown } from "@/components/useActionCooldown";
import { SteadyButton } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import {
	cooldownMsFromServer,
	getRefreshUntil,
	persistCardReload,
	persistCooldown,
} from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

export function RefreshButton({ cooldownMs }: { cooldownMs: number }) {
	const { m } = useI18n();
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [waitingTap, setWaitingTap] = useState(false);
	const { remaining, cooling, message, showError } = useActionCooldown(
		cooldownMs,
		getRefreshUntil,
	);

	const wait = m.refresh.wait.replaceAll(
		"{seconds}",
		String(Math.max(1, Math.ceil(remaining / 1000))),
	);
	const waitWide = m.refresh.wait.replaceAll("{seconds}", "120");
	const live = pending
		? waitingTap
			? m.refresh.waitingTap
			: m.refresh.pending
		: cooling
			? wait
			: m.refresh.save;

	async function onRefresh() {
		if (pending || cooling) return;
		setPending(true);
		setWaitingTap(false);
		try {
			const res = await fetch("/api/refresh", { method: "POST" });
			const { httpStatus, data } = await readJsonWithTapWait(res, () =>
				setWaitingTap(true),
			);
			if (tapWaitFailed(res, data)) {
				if (httpStatus === 429 || data.code === "refresh_cooldown") {
					persistCooldown(cooldownMsFromServer(data, res.headers));
				}
				showError(
					apiErrorText(
						{ status: httpStatus },
						data,
						m.errors.tapapi_unavailable,
						m.refresh.failed,
					),
				);
				return;
			}
			persistCardReload(
				typeof data.lastSynced === "string" ? data.lastSynced : undefined,
			);
			persistCooldown(cooldownMsFromServer(data, res.headers));
			window.setTimeout(() => router.refresh(), 0);
		} catch {
			showError(m.refresh.failed);
		} finally {
			setPending(false);
			setWaitingTap(false);
		}
	}

	return (
		<div className="tool">
			<SteadyButton
				className="btn-ghost"
				type="button"
				disabled={pending || cooling}
				labels={[
					m.refresh.save,
					m.refresh.pending,
					m.refresh.waitingTap,
					waitWide,
				]}
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
