"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SteadyButton } from "@/components/Tool";
import { ToolAlert } from "@/components/ToolAlert";
import {
	cooldownSeconds,
	useActionCooldown,
} from "@/components/useActionCooldown";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import {
	cooldownMsFromServer,
	getRefreshUntil,
	persistCardReload,
	persistCooldown,
} from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

/** The desk's primary action: pull the latest save from TapTap */
export function RefreshButton({ cooldownMs }: { cooldownMs: number }) {
	const { m } = useI18n();
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [waitingTap, setWaitingTap] = useState(false);
	const { remaining, cooling, message, showError, clearError } =
		useActionCooldown(cooldownMs, getRefreshUntil);

	const wait = m.refresh.wait.replaceAll(
		"{seconds}",
		cooldownSeconds(remaining),
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
		clearError();
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
				className="btn-primary"
				type="button"
				// aria-disabled, not disabled: focus stays put and the countdown stays readable
				aria-disabled={pending || cooling || undefined}
				aria-busy={pending || undefined}
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
			{message ? <ToolAlert message={message} onDismiss={clearError} /> : null}
		</div>
	);
}
