"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";
import { Announce } from "@/components/Tool";
import { TapQrColumn, TapServerSeg, useTapQr } from "@/components/useTapQr";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { persistCardReload } from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

const TOKEN_LEN = 25;

export function BindPanel() {
	const { m } = useI18n();
	const router = useRouter();
	const ids = useId();
	const [token, setToken] = useState("");
	const qr = useTapQr({
		base: "/api/bind",
		failedText: m.bind.failed,
		busyPhase: "binding",
		onPoll: (data) => {
			if (data.status !== "bound") return false;
			persistCardReload();
			router.replace("/me/b30");
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

	async function submitToken(e: FormEvent) {
		e.preventDefault();
		if (!tokenOk || busy) return;
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
				return;
			}
			setToken("");
			persistCardReload();
			router.replace("/me/b30");
		} catch {
			fail(m.bind.failed);
		}
	}

	const typed = token.trim();
	const tokenOk = new RegExp(`^[a-zA-Z0-9]{${TOKEN_LEN}}$`).test(typed);
	const qrSaid = waitingTap
		? m.bind.waitingTap
		: phase === "scanned"
			? m.bind.scanned
			: "";
	const tokenCount = (
		tokenOk
			? m.bind.tokenReady
			: /[^a-zA-Z0-9]/.test(typed)
				? m.bind.tokenInvalid
				: typed.length > TOKEN_LEN
					? m.bind.tokenTooLong
					: m.bind.tokenNeeds
	).replaceAll("{n}", String(typed.length));
	const serverId = `${ids}-server`;
	const qrTitleId = `${ids}-qr`;
	const tokenTitleId = `${ids}-token`;
	const tokenHintId = `${ids}-token-hint`;
	const tokenCountId = `${ids}-token-count`;

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
				<TapQrColumn qr={qr} titleId={qrTitleId} title={m.bind.qrTitle} />
				<section className="bind-token-col" aria-labelledby={tokenTitleId}>
					<p className="bind-or" aria-hidden="true">
						{m.bind.or}
					</p>
					<h2 id={tokenTitleId}>{m.bind.tokenTitle}</h2>
					<form className="bind-token" onSubmit={(e) => void submitToken(e)}>
						<label className="field field-col">
							<span className="field-label">{m.bind.tokenLabel}</span>
							<input
								type="password"
								name="sessionToken"
								autoComplete="off"
								autoCapitalize="off"
								spellCheck={false}
								maxLength={40}
								value={token}
								onChange={(e) => setToken(e.target.value)}
								placeholder={m.bind.tokenPlaceholder}
								aria-describedby={`${tokenHintId} ${tokenCountId}`}
							/>
						</label>
						<p className="field-hint" id={tokenHintId}>
							{m.bind.tokenHint}
						</p>
						<p
							className={`bind-token-count${tokenOk ? " is-ready" : ""}`}
							id={tokenCountId}
						>
							{tokenCount}
						</p>
						<button
							className="btn btn-ghost"
							type="submit"
							aria-disabled={busy || !tokenOk || undefined}
							aria-busy={phase === "binding" || undefined}
							aria-describedby={tokenCountId}
						>
							{phase === "binding"
								? waitingTap
									? m.bind.waitingTap
									: m.bind.binding
								: m.bind.tokenSubmit}
						</button>
					</form>
				</section>
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
