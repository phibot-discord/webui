"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";

type ServerKind = "cn" | "gb";
type Phase = "idle" | "qr" | "scanned" | "working";

export function BindPanel() {
	const { m } = useI18n();
	const router = useRouter();
	const [server, setServer] = useState<ServerKind>("cn");
	const [phase, setPhase] = useState<Phase>("idle");
	const [error, setError] = useState<string>();
	const [openUrl, setOpenUrl] = useState<string>();
	const [qrSrc, setQrSrc] = useState<string>();
	const [remain, setRemain] = useState(0);
	const [token, setToken] = useState("");
	const expiresAt = useRef(0);
	const intervalMs = useRef(2500);

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
		const poll = async () => {
			try {
				const res = await fetch("/api/bind/poll", { method: "POST" });
				const data = (await res.json().catch(() => ({}))) as {
					status?: string;
					error?: string;
					code?: string;
					playerId?: string;
				};
				if (dead) return;
				if (data.status === "bound") {
					router.refresh();
					return;
				}
				if (data.status === "scanned") setPhase("scanned");
				if (!res.ok) {
					setError(
						apiErrorText(res, data, m.errors.tapapi_unavailable, m.bind.failed),
					);
					setPhase("idle");
				}
			} catch {
				if (!dead) {
					setError(m.bind.failed);
					setPhase("idle");
				}
			}
		};
		const id = window.setInterval(() => void poll(), intervalMs.current);
		void poll();
		return () => {
			dead = true;
			window.clearInterval(id);
		};
	}, [phase, router, m.bind.failed, m.errors.tapapi_unavailable]);

	async function startQr() {
		setError(undefined);
		setPhase("working");
		try {
			const res = await fetch("/api/bind/qr", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ server, global: server === "gb" }),
			});
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				code?: string;
				expiresIn?: number;
				intervalMs?: number;
				openUrl?: string;
			};
			if (!res.ok) {
				setError(
					apiErrorText(res, data, m.errors.tapapi_unavailable, m.bind.failed),
				);
				setPhase("idle");
				return;
			}
			expiresAt.current = Date.now() + (data.expiresIn || 300) * 1000;
			intervalMs.current = data.intervalMs || 2500;
			setRemain(data.expiresIn || 300);
			setOpenUrl(data.openUrl);
			setQrSrc(`/api/bind/qr/image?t=${Date.now()}`);
			setPhase("qr");
		} catch {
			setError(m.bind.failed);
			setPhase("idle");
		}
	}

	async function cancelQr() {
		setPhase("idle");
		setQrSrc(undefined);
		setOpenUrl(undefined);
		await fetch("/api/bind/cancel", { method: "POST" }).catch(() => undefined);
	}

	async function submitToken(e: FormEvent) {
		e.preventDefault();
		setError(undefined);
		setPhase("working");
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
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				code?: string;
			};
			if (!res.ok) {
				setError(
					apiErrorText(res, data, m.errors.tapapi_unavailable, m.bind.failed),
				);
				setPhase("idle");
				return;
			}
			setToken("");
			router.refresh();
		} catch {
			setError(m.bind.failed);
			setPhase("idle");
		}
	}

	const busy = phase === "working";
	const tokenOk = /^[a-z0-9A-Z]{25}$/.test(token.trim());

	return (
		<section className="bind-panel">
			<h1>{m.bind.title}</h1>
			<p className="lede">{m.bind.lede}</p>
			<fieldset className="seg" aria-label={m.bind.server}>
				<button
					type="button"
					aria-pressed={server === "cn"}
					onClick={() => setServer("cn")}
				>
					{m.bind.cn}
				</button>
				<button
					type="button"
					aria-pressed={server === "gb"}
					onClick={() => setServer("gb")}
				>
					{m.bind.gb}
				</button>
			</fieldset>
			{error ? (
				<p className="bind-error" role="alert">
					{error}
				</p>
			) : null}

			<div className="bind-methods">
				<div className="bind-qr-col">
					{phase === "qr" || phase === "scanned" ? (
						<div className="bind-qr">
							{qrSrc ? (
								// TapTap login QR from this session.
								// !! NO OPTIMIZE OR CACHE!!
								<img src={qrSrc} width={220} height={220} alt={m.bind.qrAlt} />
							) : null}
							<p className="lede">
								{phase === "scanned" ? m.bind.scanned : m.bind.scan}
							</p>
							{openUrl ? (
								<p>
									<a className="text-link" href={openUrl}>
										{m.bind.openPhone}
									</a>
								</p>
							) : null}
							<p className="meta-label">
								{m.bind.expires.replaceAll("{seconds}", String(remain))}
							</p>
							<button
								className="btn btn-ghost"
								type="button"
								onClick={() => void cancelQr()}
							>
								{m.bind.cancel}
							</button>
						</div>
					) : (
						<button
							className="btn btn-primary"
							type="button"
							disabled={busy}
							onClick={() => void startQr()}
						>
							{busy ? m.bind.starting : m.bind.qr}
						</button>
					)}
				</div>
				<div className="bind-token-col">
					<p className="bind-or">{m.bind.or}</p>
					<form className="bind-token" onSubmit={(e) => void submitToken(e)}>
						<label className="field">
							<span>{m.bind.tokenLabel}</span>
							<input
								type="password"
								name="sessionToken"
								autoComplete="off"
								autoCapitalize="off"
								spellCheck={false}
								minLength={25}
								maxLength={40}
								value={token}
								onChange={(e) => setToken(e.target.value)}
								placeholder={m.bind.tokenPlaceholder}
							/>
						</label>
						<p className="field-hint">{m.bind.tokenHint}</p>
						<button
							className="btn btn-ghost"
							type="submit"
							disabled={busy || !tokenOk}
						>
							{m.bind.tokenSubmit}
						</button>
					</form>
				</div>
			</div>
		</section>
	);
}
