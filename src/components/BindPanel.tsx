"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import Link from "@/components/LocaleLink";
import { Announce } from "@/components/Tool";
import {
	TapQrColumn,
	TapServerSeg,
	TapTokenColumn,
	useTapQr,
} from "@/components/useTapQr";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { localePath } from "@/lib/locale-path";
import { persistCardReload } from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

export function BindPanel() {
	const { m, locale } = useI18n();
	const router = useRouter();
	const ids = useId();
	const [qrBound, setQrBound] = useState(false);
	const qr = useTapQr({
		base: "/api/bind",
		failedText: m.bind.failed,
		busyPhase: "binding",
		onPoll: (data) => {
			if (data.status !== "bound") return false;
			setQrBound(true);
			persistCardReload();
			router.replace(localePath("/me/b30", locale));
			return true;
		},
	});
	const {
		phase,
		setPhase,
		error,
		setError,
		waitingTap,
		setWaitingTap,
		server,
		busy,
		showQr,
		fail,
	} = qr;

	async function submitToken(token: string): Promise<boolean> {
		setError(undefined);
		setWaitingTap(false);
		if (showQr) void qr.cancelQr();
		setPhase("binding");
		try {
			const res = await fetch("/api/bind/token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token,
					server,
					global: server === "gb",
				}),
			});
			const { httpStatus, data } = await readJsonWithTapWait(res, () =>
				setWaitingTap(true),
			);
			if (tapWaitFailed(res, data)) {
				fail(
					apiErrorText(
						{ status: httpStatus },
						data,
						m.errors.tapapi_unavailable,
						m.bind.failed,
					),
				);
				return false;
			}
			persistCardReload();
			router.replace(localePath("/me/b30", locale));
			return true;
		} catch {
			fail(m.bind.failed);
			return false;
		}
	}

	const tokenBinding = phase === "binding" && !qrBound;
	const qrSaid = qrBound
		? m.bind.binding
		: waitingTap
			? m.bind.waitingTap
			: phase === "scanned"
				? m.bind.scanned
				: "";
	const serverId = `${ids}-server`;
	const qrTitleId = `${ids}-qr`;

	return (
		<section className="bind-panel">
			<h1>{m.bind.title}</h1>
			<p className="lede">{m.bind.lede}</p>
			<TapServerSeg
				id={serverId}
				server={server}
				setServer={qr.setServer}
				disabled={showQr || busy}
			/>
			{error ? (
				<p className="bind-error" role="alert">
					{error}
				</p>
			) : null}
			<Announce>{qrSaid}</Announce>

			<div className="bind-methods">
				<TapQrColumn
					qr={qr}
					titleId={qrTitleId}
					title={m.bind.qrTitle}
					signingLabel={qrBound ? m.bind.binding : undefined}
				/>
				<TapTokenColumn
					title={m.bind.tokenTitle}
					hint={m.bind.tokenHint}
					submitLabel={m.bind.tokenSubmit}
					submittingLabel={m.bind.binding}
					submitting={tokenBinding}
					waitingTap={waitingTap}
					busy={busy}
					onSubmit={submitToken}
				/>
				<section className="bind-manual-col" aria-labelledby={`${ids}-manual`}>
					<p className="bind-or" aria-hidden="true">
						{m.bind.or}
					</p>
					<h2 id={`${ids}-manual`}>{m.bind.manualTitle}</h2>
					<p className="lede">{m.bind.manualLede}</p>
					<Link className="btn btn-ghost" href="/me/manual" prefetch={false}>
						{m.bind.manualStart}
					</Link>
				</section>
			</div>
		</section>
	);
}
