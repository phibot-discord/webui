"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { signInDiscord, signInTaptap } from "@/auth-actions";
import { SignInStatus } from "@/components/landing/SignIn";
import { Announce } from "@/components/Tool";
import { TapQrColumn, TapServerSeg, useTapQr } from "@/components/useTapQr";
import { useI18n } from "@/i18n/provider";
import { persistCardReload } from "@/lib/save-refresh";

export function TapLoginPanel({ next }: { next: string }) {
	const { m } = useI18n();
	const t = m.tapLogin;
	const ids = useId();
	const [ticket, setTicket] = useState<string>();
	const [signedIn, signInAction] = useActionState(signInTaptap, {
		failed: false,
	});
	const ticketForm = useRef<HTMLFormElement>(null);
	const qr = useTapQr({
		base: "/api/login/taptap",
		failedText: t.failed,
		busyPhase: "signing",
		onPoll: (data, { setPhase, setWaitingTap }) => {
			if (data.status !== "ready" || typeof data.ticket !== "string")
				return false;
			persistCardReload();
			setWaitingTap(false);
			setPhase("signing");
			setTicket(data.ticket);
			return true;
		},
	});
	const { phase, setPhase, error, setError, waitingTap, server, busy, showQr } =
		qr;

	useEffect(() => {
		if (ticket) ticketForm.current?.requestSubmit();
	}, [ticket]);

	useEffect(() => {
		if (!signedIn.failed) return;
		setTicket(undefined);
		setError(t.failed);
		setPhase("idle");
	}, [signedIn, t.failed, setError, setPhase]);

	const qrSaid =
		phase === "signing"
			? t.signingIn
			: waitingTap
				? m.bind.waitingTap
				: phase === "scanned"
					? m.bind.scanned
					: "";
	const serverId = `${ids}-server`;
	const qrTitleId = `${ids}-qr`;
	const discordTitleId = `${ids}-discord`;

	return (
		<section className="bind-panel">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
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
					title={t.qrTitle}
					signingLabel={phase === "signing" ? t.signingIn : undefined}
				/>
				<section className="bind-alt-col" aria-labelledby={discordTitleId}>
					<p className="bind-or" aria-hidden="true">
						{m.bind.or}
					</p>
					<h2 id={discordTitleId}>{t.discordTitle}</h2>
					<p className="lede">{t.discordLede}</p>
					<form action={signInDiscord}>
						<input type="hidden" name="next" value={next} />
						<button className="btn btn-ghost" type="submit">
							{m.signIn}
						</button>
						<SignInStatus />
					</form>
				</section>
			</div>
			<form ref={ticketForm} action={signInAction} hidden>
				<input type="hidden" name="ticket" value={ticket ?? ""} />
				<input type="hidden" name="next" value={next} />
			</form>
		</section>
	);
}
