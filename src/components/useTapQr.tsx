"use client";

import { CheckCircle, DeviceMobile } from "@phosphor-icons/react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";

type ServerKind = "cn" | "gb";
type TapQrPhase<X extends string> = "idle" | "starting" | "qr" | "scanned" | X;
type TapWaitData = Awaited<ReturnType<typeof readJsonWithTapWait>>["data"];

export function useTapQr<X extends string>({
	base,
	failedText,
	busyPhase,
	onPoll,
}: {
	base: string;
	failedText: string;
	busyPhase: X;
	onPoll: (
		data: TapWaitData,
		qr: {
			setPhase: (p: TapQrPhase<X>) => void;
			setWaitingTap: (v: boolean) => void;
		},
	) => boolean;
}) {
	const { m } = useI18n();
	const [server, setServer] = useState<ServerKind>("cn");
	const [phase, setPhase] = useState<TapQrPhase<X>>("idle");
	const [error, setError] = useState<string>();
	const [openUrl, setOpenUrl] = useState<string>();
	const [qrSrc, setQrSrc] = useState<string>();
	const [remain, setRemain] = useState(0);
	const [waitingTap, setWaitingTap] = useState(false);
	const [touch, setTouch] = useState(false);
	const expiresAt = useRef(0);
	const intervalMs = useRef(2500);
	const startRef = useRef<HTMLButtonElement>(null);
	const statusRef = useRef<HTMLParagraphElement>(null);
	const lastPhase = useRef(phase);
	const onPollRef = useRef(onPoll);
	onPollRef.current = onPoll;

	const fail = useCallback((msg: string) => {
		setError(msg);
		setWaitingTap(false);
		setPhase("idle");
	}, []);

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
				fail(m.errors.qr_expired);
				void fetch(`${base}/cancel`, { method: "POST" }).catch(() => undefined);
			}
		}, 250);
		return () => window.clearInterval(tick);
	}, [phase, base, fail, m.errors.qr_expired]);

	useEffect(() => {
		if (phase !== "qr" && phase !== "scanned") return;
		const ctrl = new AbortController();
		let dead = false;
		let busy = false;
		const poll = async () => {
			if (dead || busy || document.hidden) return;
			busy = true;
			try {
				const res = await fetch(`${base}/poll`, {
					method: "POST",
					signal: ctrl.signal,
				});
				const { httpStatus, data } = await readJsonWithTapWait(res, () => {
					if (!dead) setWaitingTap(true);
				});
				if (dead) return;
				if (onPollRef.current(data, { setPhase, setWaitingTap })) {
					dead = true;
					setWaitingTap(false);
					setPhase((p) => (p === "qr" || p === "scanned" ? busyPhase : p));
					return;
				}
				if (data.status === "scanned") setPhase("scanned");
				if (tapWaitFailed(res, data)) {
					fail(
						apiErrorText(
							{ status: httpStatus },
							data,
							m.errors.tapapi_unavailable,
							failedText,
						),
					);
				}
			} catch {
				if (!dead) fail(failedText);
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
			ctrl.abort();
			window.clearInterval(id);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [phase, base, busyPhase, failedText, fail, m.errors.tapapi_unavailable]);

	const tapWait = waitingTap && phase !== "idle";
	const busy = phase === "starting" || phase === busyPhase || tapWait;
	const showQr = phase === "qr" || phase === "scanned";

	async function startQr() {
		if (busy || showQr) return;
		setError(undefined);
		setWaitingTap(false);
		setTouch(window.matchMedia("(pointer: coarse)").matches);
		setPhase("starting");
		try {
			const res = await fetch(`${base}/qr`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ server, global: server === "gb" }),
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
						failedText,
					),
				);
				return;
			}
			expiresAt.current = Date.now() + (Number(data.expiresIn) || 300) * 1000;
			intervalMs.current = Number(data.intervalMs) || 2500;
			setRemain(Number(data.expiresIn) || 300);
			setOpenUrl(typeof data.openUrl === "string" ? data.openUrl : undefined);
			setQrSrc(`${base}/qr/image?t=${Date.now()}`);
			setWaitingTap(false);
			setPhase("qr");
		} catch {
			fail(failedText);
		}
	}

	async function cancelQr() {
		setPhase("idle");
		setWaitingTap(false);
		setQrSrc(undefined);
		setOpenUrl(undefined);
		await fetch(`${base}/cancel`, { method: "POST" }).catch(() => undefined);
	}

	return {
		server,
		setServer,
		phase,
		setPhase,
		error,
		setError,
		openUrl,
		qrSrc,
		remain,
		waitingTap: tapWait,
		setWaitingTap,
		touch,
		busy,
		showQr,
		startRef,
		statusRef,
		startQr,
		cancelQr,
		fail,
	};
}

export function TapServerSeg({
	id,
	server,
	setServer,
	disabled,
}: {
	id: string;
	server: ServerKind;
	setServer: (s: ServerKind) => void;
	disabled: boolean;
}) {
	const { m } = useI18n();
	return (
		<div className="bind-server">
			<span className="field-label" id={id}>
				{m.bind.server}
			</span>
			<fieldset className="seg" aria-labelledby={id}>
				<button
					type="button"
					aria-pressed={server === "cn"}
					disabled={disabled}
					onClick={() => setServer("cn")}
				>
					{m.bind.cn}
				</button>
				<button
					type="button"
					aria-pressed={server === "gb"}
					disabled={disabled}
					onClick={() => setServer("gb")}
				>
					{m.bind.gb}
				</button>
			</fieldset>
		</div>
	);
}

export function TapQrColumn({
	qr,
	titleId,
	title,
	signingLabel,
}: {
	qr: {
		phase: string;
		showQr: boolean;
		busy: boolean;
		waitingTap: boolean;
		touch: boolean;
		openUrl?: string;
		qrSrc?: string;
		remain: number;
		statusRef: RefObject<HTMLParagraphElement | null>;
		startRef: RefObject<HTMLButtonElement | null>;
		startQr: () => Promise<void>;
		cancelQr: () => Promise<void>;
	};
	titleId: string;
	title: string;
	signingLabel?: string;
}) {
	const { m } = useI18n();
	const scanned = qr.phase === "scanned" || qr.waitingTap;
	const qrStatus = qr.waitingTap
		? m.bind.waitingTap
		: qr.phase === "scanned"
			? m.bind.scanned
			: m.bind.scan;
	const openLink =
		qr.showQr && qr.openUrl ? (
			<a
				className={`btn ${qr.touch ? "btn-primary" : "btn-ghost"} bind-open`}
				href={qr.openUrl}
			>
				<DeviceMobile size={18} aria-hidden />
				{m.bind.openPhone}
			</a>
		) : null;

	return (
		<section className="bind-qr-col" aria-labelledby={titleId}>
			<h2 id={titleId}>{title}</h2>
			{qr.showQr ? (
				<div className="bind-qr">
					<p className="bind-qr-status" ref={qr.statusRef} tabIndex={-1}>
						{qrStatus}
					</p>
					{qr.touch ? openLink : null}
					{qr.touch && openLink ? (
						<p className="field-hint">{m.bind.openPhoneHint}</p>
					) : null}
					{qr.qrSrc ? (
						<div className={`bind-qr-frame${scanned ? " is-scanned" : ""}`}>
							{/* biome-ignore lint/performance/noImgElement: per-session QR, never optimized or cached */}
							<img src={qr.qrSrc} width={220} height={220} alt={m.bind.qrAlt} />
							{scanned ? (
								<div className="bind-qr-done" aria-hidden="true">
									<CheckCircle size={72} weight="fill" />
								</div>
							) : null}
						</div>
					) : null}
					<p className="bind-expires">
						{m.bind.expires.replaceAll("{seconds}", String(qr.remain))}
					</p>
					<div className="bind-qr-actions">
						{qr.touch ? null : openLink}
						<button
							className="btn btn-ghost"
							type="button"
							onClick={() => void qr.cancelQr()}
						>
							{m.bind.cancel}
						</button>
					</div>
				</div>
			) : (
				<button
					ref={qr.startRef}
					className="btn btn-primary"
					type="button"
					aria-disabled={qr.busy || undefined}
					aria-busy={
						qr.phase === "starting" || signingLabel !== undefined || undefined
					}
					onClick={() => void qr.startQr()}
				>
					{signingLabel ??
						(qr.phase === "starting"
							? qr.waitingTap
								? m.bind.waitingTap
								: m.bind.starting
							: m.bind.qr)}
				</button>
			)}
		</section>
	);
}
