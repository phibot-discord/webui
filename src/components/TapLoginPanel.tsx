"use client";

import { DeviceMobile } from "@phosphor-icons/react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { signInDiscord, signInTaptap } from "@/auth-actions";
import { SignInStatus } from "@/components/landing/SignIn";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { persistCardReload } from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

type ServerKind = "cn" | "gb";
type Phase = "idle" | "starting" | "qr" | "scanned" | "signing";

export function TapLoginPanel({ next }: { next: string }) {
	const { m } = useI18n();
	const t = m.tapLogin;
	const ids = useId();
	const [server, setServer] = useState<ServerKind>("cn");
	const [phase, setPhase] = useState<Phase>("idle");
	const [error, setError] = useState<string>();
	const [openUrl, setOpenUrl] = useState<string>();
	const [qrSrc, setQrSrc] = useState<string>();
	const [remain, setRemain] = useState(0);
	const [ticket, setTicket] = useState<string>();
	const [waitingTap, setWaitingTap] = useState(false);
	const [touch, setTouch] = useState(false);
	const [signedIn, signInAction] = useActionState(signInTaptap, {
		failed: false,
	});
	const expiresAt = useRef(0);
	const intervalMs = useRef(2500);
	const startRef = useRef<HTMLButtonElement>(null);
	const statusRef = useRef<HTMLParagraphElement>(null);
	const ticketForm = useRef<HTMLFormElement>(null);
	const lastPhase = useRef(phase);

	useEffect(() => {
		const was = lastPhase.current;
		lastPhase.current = phase;
		if (was === phase) return;
		const lost =
			!document.activeElement || document.activeElement === document.body;
		if (!lost) return;
		if (phase === "qr") statusRef.current?.focus();
		else if (phase === "idle") startRef.current?.focus();
	}, [phase]);

	useEffect(() => {
		if (ticket) ticketForm.current?.requestSubmit();
	}, [ticket]);

	useEffect(() => {
		if (!signedIn.failed) return;
		setTicket(undefined);
		setError(t.failed);
		setPhase("idle");
	}, [signedIn, t.failed]);

	useEffect(() => {
		if (phase !== "qr" && phase !== "scanned") return;
		const tick = window.setInterval(() => {
			const left = Math.max(
				0,
				Math.ceil((expiresAt.current - Date.now()) / 1000),
			);
			setRemain(left);
			if (left === 0) {
				setError(m.errors.qr_expired);
				setWaitingTap(false);
				setPhase("idle");
				void fetch("/api/login/taptap/cancel", { method: "POST" }).catch(
					() => undefined,
				);
			}
		}, 250);
		return () => window.clearInterval(tick);
	}, [phase, m.errors.qr_expired]);

	useEffect(() => {
		if (phase !== "qr" && phase !== "scanned") return;
		let dead = false;
		let busy = false;
		const poll = async () => {
			if (dead || busy || document.hidden) return;
			busy = true;
			try {
				const res = await fetch("/api/login/taptap/poll", { method: "POST" });
				const { httpStatus, data } = await readJsonWithTapWait(res, () =>
					setWaitingTap(true),
				);
				if (dead) return;
				if (data.status === "ready" && typeof data.ticket === "string") {
					persistCardReload();
					setWaitingTap(false);
					setPhase("signing");
					setTicket(data.ticket);
					return;
				}
				if (data.status === "scanned") setPhase("scanned");
				if (tapWaitFailed(res, data)) {
					setError(
						apiErrorText(
							{ status: httpStatus },
							data,
							m.errors.tapapi_unavailable,
							t.failed,
						),
					);
					setWaitingTap(false);
					setPhase("idle");
				}
			} catch {
				if (!dead) {
					setError(t.failed);
					setWaitingTap(false);
					setPhase("idle");
				}
			} finally {
				busy = false;
			}
		};
		const onVisible = () => {
			if (!document.hidden) void poll();
		};
		const id = window.setInterval(() => void poll(), intervalMs.current);
		document.addEventListener("visibilitychange", onVisible);
		void poll();
		return () => {
			dead = true;
			window.clearInterval(id);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [phase, t.failed, m.errors.tapapi_unavailable]);

	async function startQr() {
		if (busy || showQr) return;
		setError(undefined);
		setWaitingTap(false);
		setTouch(window.matchMedia("(pointer: coarse)").matches);
		setPhase("starting");
		try {
			const res = await fetch("/api/login/taptap/qr", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ server, global: server === "gb" }),
			});
			const { httpStatus, data } = await readJsonWithTapWait(res, () =>
				setWaitingTap(true),
			);
			if (tapWaitFailed(res, data)) {
				setError(
					apiErrorText(
						{ status: httpStatus },
						data,
						m.errors.tapapi_unavailable,
						t.failed,
					),
				);
				setWaitingTap(false);
				setPhase("idle");
				return;
			}
			expiresAt.current = Date.now() + (Number(data.expiresIn) || 300) * 1000;
			intervalMs.current = Number(data.intervalMs) || 2500;
			setRemain(Number(data.expiresIn) || 300);
			setOpenUrl(typeof data.openUrl === "string" ? data.openUrl : undefined);
			setQrSrc(`/api/login/taptap/qr/image?t=${Date.now()}`);
			setWaitingTap(false);
			setPhase("qr");
		} catch {
			setError(t.failed);
			setWaitingTap(false);
			setPhase("idle");
		}
	}

	async function cancelQr() {
		setPhase("idle");
		setWaitingTap(false);
		setQrSrc(undefined);
		setOpenUrl(undefined);
		await fetch("/api/login/taptap/cancel", { method: "POST" }).catch(
			() => undefined,
		);
	}

	const busy = phase === "starting" || phase === "signing" || waitingTap;
	const showQr = phase === "qr" || phase === "scanned";
	const qrStatus = waitingTap
		? m.bind.waitingTap
		: phase === "scanned"
			? m.bind.scanned
			: m.bind.scan;
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
	const openLink =
		showQr && openUrl ? (
			<a
				className={`btn ${touch ? "btn-primary" : "btn-ghost"} bind-open`}
				href={openUrl}
			>
				<DeviceMobile size={18} aria-hidden />
				{m.bind.openPhone}
			</a>
		) : null;

	return (
		<section className="bind-panel">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<div className="bind-server">
				<span className="field-label" id={serverId}>
					{m.bind.server}
				</span>
				<fieldset className="seg" aria-labelledby={serverId}>
					<button
						type="button"
						aria-pressed={server === "cn"}
						disabled={showQr || busy}
						onClick={() => setServer("cn")}
					>
						{m.bind.cn}
					</button>
					<button
						type="button"
						aria-pressed={server === "gb"}
						disabled={showQr || busy}
						onClick={() => setServer("gb")}
					>
						{m.bind.gb}
					</button>
				</fieldset>
			</div>
			{error ? (
				<p className="bind-error" role="alert">
					{error}
				</p>
			) : null}
			<Announce>{qrSaid}</Announce>

			<div className="bind-methods">
				<section className="bind-qr-col" aria-labelledby={qrTitleId}>
					<h2 id={qrTitleId}>{t.qrTitle}</h2>
					{showQr ? (
						<div className="bind-qr">
							<p className="bind-qr-status" ref={statusRef} tabIndex={-1}>
								{qrStatus}
							</p>
							{touch ? openLink : null}
							{touch && openLink ? (
								<p className="field-hint">{m.bind.openPhoneHint}</p>
							) : null}
							{qrSrc ? (
								// biome-ignore lint/performance/noImgElement: per-session QR, never optimized or cached
								<img src={qrSrc} width={220} height={220} alt={m.bind.qrAlt} />
							) : null}
							<p className="bind-expires">
								{m.bind.expires.replaceAll("{seconds}", String(remain))}
							</p>
							<div className="bind-qr-actions">
								{touch ? null : openLink}
								<button
									className="btn btn-ghost"
									type="button"
									onClick={() => void cancelQr()}
								>
									{m.bind.cancel}
								</button>
							</div>
						</div>
					) : (
						<button
							ref={startRef}
							className="btn btn-primary"
							type="button"
							aria-disabled={busy || undefined}
							aria-busy={
								phase === "starting" || phase === "signing" || undefined
							}
							onClick={() => void startQr()}
						>
							{phase === "signing"
								? t.signingIn
								: phase === "starting"
									? waitingTap
										? m.bind.waitingTap
										: m.bind.starting
									: m.bind.qr}
						</button>
					)}
				</section>
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
