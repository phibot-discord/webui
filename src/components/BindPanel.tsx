"use client";

import { DeviceMobile } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { Announce } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { persistCardReload } from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

type ServerKind = "cn" | "gb";
// "starting" fetches a QR code, "binding" checks a pasted sessionToken
type Phase = "idle" | "starting" | "binding" | "qr" | "scanned";

const TOKEN_LEN = 25;

export function BindPanel() {
	const { m } = useI18n();
	const router = useRouter();
	const ids = useId();
	const [server, setServer] = useState<ServerKind>("cn");
	const [phase, setPhase] = useState<Phase>("idle");
	const [error, setError] = useState<string>();
	const [openUrl, setOpenUrl] = useState<string>();
	const [qrSrc, setQrSrc] = useState<string>();
	const [remain, setRemain] = useState(0);
	const [token, setToken] = useState("");
	const [waitingTap, setWaitingTap] = useState(false);
	// A phone can't scan its own screen: there the deep link leads
	const [touch, setTouch] = useState(false);
	const expiresAt = useRef(0);
	const intervalMs = useRef(2500);
	const startRef = useRef<HTMLButtonElement>(null);
	const statusRef = useRef<HTMLParagraphElement>(null);
	const lastPhase = useRef(phase);

	// The QR block and the start button replace each other. When the control
	// that had focus went with the swap, focus moves to what took its place
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
				void fetch("/api/bind/cancel", { method: "POST" }).catch(
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
			// A hidden tab (the visitor switched to TapTap) polls again when it is back
			if (dead || busy || document.hidden) return;
			busy = true;
			try {
				const res = await fetch("/api/bind/poll", { method: "POST" });
				const { httpStatus, data } = await readJsonWithTapWait(res, () =>
					setWaitingTap(true),
				);
				if (dead) return;
				if (data.status === "bound") {
					persistCardReload();
					router.replace("/me/b30");
					return;
				}
				if (data.status === "scanned") setPhase("scanned");
				if (tapWaitFailed(res, data)) {
					setError(
						apiErrorText(
							{ status: httpStatus },
							data,
							m.errors.tapapi_unavailable,
							m.bind.failed,
						),
					);
					setWaitingTap(false);
					setPhase("idle");
				}
			} catch {
				if (!dead) {
					setError(m.bind.failed);
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
	}, [phase, router, m.bind.failed, m.errors.tapapi_unavailable]);

	async function startQr() {
		if (busy || showQr) return;
		setError(undefined);
		setWaitingTap(false);
		setTouch(window.matchMedia("(pointer: coarse)").matches);
		setPhase("starting");
		try {
			const res = await fetch("/api/bind/qr", {
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
						m.bind.failed,
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
			setQrSrc(`/api/bind/qr/image?t=${Date.now()}`);
			setWaitingTap(false);
			setPhase("qr");
		} catch {
			setError(m.bind.failed);
			setWaitingTap(false);
			setPhase("idle");
		}
	}

	async function cancelQr() {
		setPhase("idle");
		setWaitingTap(false);
		setQrSrc(undefined);
		setOpenUrl(undefined);
		await fetch("/api/bind/cancel", { method: "POST" }).catch(() => undefined);
	}

	async function submitToken(e: FormEvent) {
		e.preventDefault();
		if (!tokenOk || busy) return;
		setError(undefined);
		setWaitingTap(false);
		if (showQr) {
			// The token wins: close the QR session instead of leaving it open on the server
			setQrSrc(undefined);
			setOpenUrl(undefined);
			void fetch("/api/bind/cancel", { method: "POST" }).catch(() => undefined);
		}
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
				setError(
					apiErrorText(
						{ status: httpStatus },
						data,
						m.errors.tapapi_unavailable,
						m.bind.failed,
					),
				);
				setWaitingTap(false);
				setPhase("idle");
				return;
			}
			setToken("");
			persistCardReload();
			router.replace("/me/b30");
		} catch {
			setError(m.bind.failed);
			setWaitingTap(false);
			setPhase("idle");
		}
	}

	const busy = phase === "starting" || phase === "binding" || waitingTap;
	const showQr = phase === "qr" || phase === "scanned";
	const typed = token.trim();
	const tokenOk = new RegExp(`^[a-zA-Z0-9]{${TOKEN_LEN}}$`).test(typed);
	const qrStatus = waitingTap
		? m.bind.waitingTap
		: phase === "scanned"
			? m.bind.scanned
			: m.bind.scan;
	// The first "Scan with TapTap" is read when focus lands on it; later changes are announced
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
			<h1>{m.bind.title}</h1>
			<p className="lede">{m.bind.lede}</p>
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
			{/* QR progress, read out as it changes (scanned, waiting on TapTap) */}
			<Announce>{qrSaid}</Announce>

			<div className="bind-methods">
				<section className="bind-qr-col" aria-labelledby={qrTitleId}>
					<h2 id={qrTitleId}>{m.bind.qrTitle}</h2>
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
								// TapTap login QR from this session
								// !! NO OPTIMIZE OR CACHE!!
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
							aria-busy={phase === "starting" || undefined}
							onClick={() => void startQr()}
						>
							{phase === "starting"
								? waitingTap
									? m.bind.waitingTap
									: m.bind.starting
								: m.bind.qr}
						</button>
					)}
				</section>
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
