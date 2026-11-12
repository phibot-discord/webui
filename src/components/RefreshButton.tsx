"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "@/components/LocaleLink";
import { SteadyButton } from "@/components/Tool";
import { ToolAlert } from "@/components/ToolAlert";
import {
	cooldownSeconds,
	useActionCooldown,
} from "@/components/useActionCooldown";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import type { RefreshSummary } from "@/lib/refresh-summary";
import {
	cooldownMsFromServer,
	getRefreshUntil,
	persistCardReload,
	persistCooldown,
} from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";
import { fill } from "@/phi/lib/card-i18n";
import { REFRESH_COOLDOWN_MS } from "@/server/cooldown";

export function RefreshButton({ cooldownMs }: { cooldownMs: number }) {
	const { m } = useI18n();
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [waitingTap, setWaitingTap] = useState(false);
	const [note, setNote] = useState<string | null>(null);
	const [linked, setLinked] = useState(false);
	const { remaining, cooling, message, showError, clearError } =
		useActionCooldown(cooldownMs, getRefreshUntil);

	const wait = m.refresh.wait.replaceAll(
		"{seconds}",
		cooldownSeconds(remaining),
	);
	const waitWide = m.refresh.wait.replaceAll(
		"{seconds}",
		cooldownSeconds(REFRESH_COOLDOWN_MS),
	);
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
		setNote(null);
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
			persistCardReload();
			persistCooldown(cooldownMsFromServer(data, res.headers));
			const summary = (data as { summary?: RefreshSummary | null }).summary;
			if (summary?.kind === "same") {
				setNote(m.refresh.same);
				setLinked(false);
			} else if (summary?.kind === "changed") {
				const parts: string[] = [];
				const [from, to] = summary.rks;
				if (from != null && to != null && from.toFixed(4) !== to.toFixed(4)) {
					parts.push(
						fill(m.refresh.sumRks, {
							from: from.toFixed(4),
							to: to.toFixed(4),
						}),
					);
				}
				if (summary.charts) {
					parts.push(fill(m.refresh.sumCharts, { n: summary.charts }));
				}
				if (summary.fc) parts.push(fill(m.refresh.sumFc, { n: summary.fc }));
				if (summary.ap) parts.push(fill(m.refresh.sumAp, { n: summary.ap }));
				setNote(parts.length ? parts.join(" · ") : m.refresh.sumNone);
				setLinked(summary.charts > 0);
			}
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
			{note && !message ? (
				<ToolAlert tone="note" message={note} onDismiss={() => setNote(null)}>
					{linked ? (
						<>
							{" "}
							<Link href="/trend" prefetch={false}>
								{m.refresh.seeChanges}
							</Link>
						</>
					) : null}
				</ToolAlert>
			) : null}
		</div>
	);
}
