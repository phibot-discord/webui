"use client";

import Link from "next/link";
import {
	type FormEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { SyncTime } from "@/components/Desk";
import { Announce, SteadyButton } from "@/components/Tool";
import { TapQrColumn, TapServerSeg, useTapQr } from "@/components/useTapQr";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";
import type {
	BoundAccount,
	MigratePreview,
	SaveSide,
	Server,
	Slot,
} from "@/server/migrate";

type Step = "from" | "to" | "review" | "done";
type Done = { to: SaveSide; toIsBound: boolean };
type TapQr = ReturnType<typeof useTapQr<"connecting">>;
type TapData = Awaited<ReturnType<typeof readJsonWithTapWait>>["data"];

const TOKEN_LEN = 25;
const WAIT_S = 5;

function asSide(raw: unknown): SaveSide | undefined {
	if (!raw || typeof raw !== "object") return;
	const side = raw as SaveSide;
	if (typeof side.player !== "string") return;
	return side.server === "cn" || side.server === "gb" ? side : undefined;
}

function asPreview(raw: unknown): MigratePreview | undefined {
	if (!raw || typeof raw !== "object") return;
	const view = raw as MigratePreview;
	return asSide(view.from) && asSide(view.to) ? view : undefined;
}

function settle(qr: TapQr) {
	qr.setPhase("idle");
	qr.setWaitingTap(false);
	qr.setError(undefined);
}

export function MigratePanel({ bound }: { bound?: BoundAccount }) {
	const { m } = useI18n();
	const t = m.migrate;
	const ids = useId();
	const [step, setStep] = useState<Step>("from");
	const [from, setFrom] = useState<SaveSide>();
	const [view, setView] = useState<MigratePreview>();
	const [done, setDone] = useState<Done>();
	const [notice, setNotice] = useState<string>();
	const [runError, setRunError] = useState<string>();
	const [running, setRunning] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [boundBusy, setBoundBusy] = useState(false);
	const [until, setUntil] = useState(0);
	const [left, setLeft] = useState(0);
	const fromHead = useRef<HTMLHeadingElement>(null);
	const toHead = useRef<HTMLHeadingElement>(null);
	const reviewHead = useRef<HTMLHeadingElement>(null);
	const doneHead = useRef<HTMLHeadingElement>(null);
	const lastStep = useRef(step);

	const fromQr = useTapQr({
		base: "/api/migrate/from",
		failedText: t.failed,
		busyPhase: "connecting",
		onPoll: (data) => ready("from", data),
	});
	const toQr = useTapQr({
		base: "/api/migrate/to",
		failedText: t.failed,
		busyPhase: "connecting",
		onPoll: (data) => ready("to", data),
	});

	useEffect(() => {
		if (lastStep.current === step) return;
		lastStep.current = step;
		const head =
			step === "from"
				? fromHead
				: step === "to"
					? toHead
					: step === "review"
						? reviewHead
						: doneHead;
		head.current?.focus();
	}, [step]);

	useEffect(() => {
		if (!until) return;
		const tick = window.setInterval(() => {
			const s = Math.max(0, Math.ceil((until - Date.now()) / 1000));
			setLeft(s);
			if (!s) window.clearInterval(tick);
		}, 250);
		return () => window.clearInterval(tick);
	}, [until]);

	function chooseFrom(side: SaveSide) {
		setFrom(side);
		setView(undefined);
		settle(fromQr);
		settle(toQr);
		setStep("to");
	}

	function showPreview(next: MigratePreview) {
		setView(next);
		setNotice(undefined);
		setRunError(undefined);
		setUntil(Date.now() + WAIT_S * 1000);
		setLeft(WAIT_S);
		settle(toQr);
		setStep("review");
	}

	function ready(slot: Slot, data: TapData): boolean {
		if (data.code === "migrate_expired") {
			void reset(data.error || m.errors.migrate_expired);
			return true;
		}
		if (data.status !== "ready") return false;
		if (slot === "from") {
			const side = asSide(data.side);
			if (!side) return false;
			chooseFrom(side);
			return true;
		}
		const next = asPreview(data.preview);
		if (!next) return false;
		showPreview(next);
		return true;
	}

	async function reset(error?: string) {
		setResetting(true);
		settle(fromQr);
		settle(toQr);
		await fetch("/api/migrate/reset", { method: "POST" }).catch(
			() => undefined,
		);
		setFrom(undefined);
		setView(undefined);
		setDone(undefined);
		setNotice(undefined);
		setRunError(undefined);
		setUntil(0);
		if (error) fromQr.setError(error);
		setStep("from");
		setResetting(false);
	}

	function change() {
		if (running || resetting || toQr.busy) return;
		void reset();
	}

	async function connectBound() {
		if (fromQr.busy || resetting) return;
		fromQr.setError(undefined);
		fromQr.setWaitingTap(false);
		if (fromQr.showQr) void fromQr.cancelQr();
		fromQr.setPhase("connecting");
		setBoundBusy(true);
		try {
			const res = await fetch("/api/migrate/bound", { method: "POST" });
			const { httpStatus, data } = await readJsonWithTapWait(res, () =>
				fromQr.setWaitingTap(true),
			);
			if (ready("from", data)) return;
			fromQr.fail(
				apiErrorText(
					{ status: httpStatus },
					data,
					m.errors.tapapi_unavailable,
					t.failed,
				),
			);
		} catch {
			fromQr.fail(t.failed);
		} finally {
			setBoundBusy(false);
		}
	}

	async function run() {
		if (!view || left > 0 || running || resetting) return;
		setRunError(undefined);
		setNotice(undefined);
		setRunning(true);
		try {
			const res = await fetch("/api/migrate/run", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ confirm: true }),
			});
			const { httpStatus, data } = await readJsonWithTapWait(
				res,
				() => undefined,
			);
			const to = asSide(data.to);
			if (!tapWaitFailed(res, data) && data.status === "done" && to) {
				setDone({ to, toIsBound: data.toIsBound === true });
				setStep("done");
				return;
			}
			const next = asPreview(data.preview);
			if (data.code === "migrate_changed" && next) {
				showPreview(next);
				setNotice(t.changed);
				reviewHead.current?.focus();
				return;
			}
			const text = apiErrorText(
				{ status: httpStatus },
				data,
				m.errors.tapapi_unavailable,
				m.errors.migrate_failed,
			);
			if (data.code === "migrate_expired") {
				await reset(text);
				return;
			}
			setRunError(text);
		} catch {
			setRunError(m.errors.migrate_failed);
		} finally {
			setRunning(false);
		}
	}

	const serverName = (s: Server) => (s === "gb" ? m.bind.gb : m.bind.cn);
	const waitLabel = (n: number) => t.wait.replaceAll("{seconds}", String(n));
	const active = step === "to" ? toQr : fromQr;
	const said = running
		? t.running
		: active.waitingTap
			? m.bind.waitingTap
			: active.phase === "connecting"
				? t.connecting
				: active.phase === "scanned"
					? m.bind.scanned
					: "";
	const error =
		step === "from"
			? fromQr.error
			: step === "to"
				? toQr.error
				: step === "review"
					? runError
					: undefined;
	const alert = error ? (
		<p className="bind-error" role="alert">
			{error}
		</p>
	) : null;
	const fromId = `${ids}-from`;
	const toId = `${ids}-to`;
	const reviewId = `${ids}-review`;
	const doneId = `${ids}-done`;

	return (
		<section className="bind-panel">
			<h1>{t.title}</h1>
			<p className="lede">{t.lede}</p>
			<Announce>{said}</Announce>

			{step === "done" ? null : (
				<section className="migrate-step" aria-labelledby={fromId}>
					<h2 id={fromId} ref={fromHead} tabIndex={-1}>
						{t.fromTitle}
					</h2>
					{from ? (
						<AccountCard
							player={from.player}
							server={from.server}
							rks={from.rks}
							action={
								<button
									className="btn btn-ghost btn-sm"
									type="button"
									aria-disabled={running || resetting || toQr.busy || undefined}
									aria-busy={resetting || undefined}
									onClick={change}
								>
									{t.change}
								</button>
							}
						/>
					) : (
						<>
							<p className="lede">{t.fromLede}</p>
							{alert}
							{bound ? (
								<>
									<AccountCard
										label={t.boundNote}
										player={bound.player}
										server={bound.server}
										rks={bound.rks}
										action={
											<button
												className="btn btn-primary"
												type="button"
												aria-disabled={fromQr.busy || resetting || undefined}
												aria-busy={boundBusy || undefined}
												onClick={() => void connectBound()}
											>
												{boundBusy
													? fromQr.waitingTap
														? m.bind.waitingTap
														: t.connecting
													: t.useBound}
											</button>
										}
									/>
									<p className="migrate-or">{t.otherFrom}</p>
								</>
							) : null}
							<SignIn
								slot="from"
								qr={fromQr}
								otherBusy={boundBusy || resetting}
								onReady={(data) => ready("from", data)}
							/>
						</>
					)}
				</section>
			)}

			{step === "to" ? (
				<section className="migrate-step" aria-labelledby={toId}>
					<h2 id={toId} ref={toHead} tabIndex={-1}>
						{t.toTitle}
					</h2>
					<p className="lede">{t.toLede}</p>
					{alert}
					<SignIn
						slot="to"
						qr={toQr}
						otherBusy={resetting}
						note={toQr.server === "cn" ? t.realName : undefined}
						onReady={(data) => ready("to", data)}
					/>
				</section>
			) : null}

			{step === "review" && view ? (
				<section className="migrate-step" aria-labelledby={reviewId}>
					<h2 id={reviewId} ref={reviewHead} tabIndex={-1}>
						{t.previewTitle}
					</h2>
					<p className="lede">{t.previewLede}</p>
					{notice ? (
						<p className="account-notice" role="status">
							{notice}
						</p>
					) : null}
					<div className="migrate-table-wrap">
						<table className="migrate-table">
							<caption className="sr-only">{t.compare}</caption>
							<thead>
								<tr>
									<th scope="col">{t.field}</th>
									<th scope="col">{t.source}</th>
									<th scope="col">{t.target}</th>
								</tr>
							</thead>
							<tbody>
								<SideRow
									label={t.server}
									view={view}
									cell={(s) => serverName(s.server)}
								/>
								<SideRow
									label={t.player}
									view={view}
									cell={(s) =>
										(s.player ? displayPlayerId(s.player) : "") || t.none
									}
								/>
								<SideRow
									label={t.rks}
									view={view}
									cell={(s) => (s.rks != null ? displayRks(s.rks) : t.none)}
								/>
								<SideRow
									label={t.challenge}
									view={view}
									cell={(s) => challengeText(s.challengeModeRank, t)}
								/>
								<SideRow
									label={t.modified}
									view={view}
									cell={(s) =>
										s.modifiedAt ? (
											<SyncTime iso={s.modifiedAt} />
										) : s.hasSave ? (
											t.none
										) : (
											t.noSave
										)
									}
								/>
							</tbody>
						</table>
					</div>
					<p className={view.to.hasSave ? "migrate-warn" : "migrate-note"}>
						{view.to.hasSave ? t.overwrite : t.fresh}
					</p>
					{view.newer ? <p className="migrate-warn">{t.newer}</p> : null}
					{view.to.server === "cn" ? (
						<p className="migrate-note">{t.realName}</p>
					) : null}
					{alert}
					<div className="migrate-actions">
						<SteadyButton
							className="btn-primary"
							type="button"
							labels={[waitLabel(WAIT_S), t.run, t.running]}
							aria-disabled={left > 0 || running || resetting || undefined}
							aria-busy={running || undefined}
							onClick={() => void run()}
						>
							{running ? t.running : left > 0 ? waitLabel(left) : t.run}
						</SteadyButton>
						<button
							className="btn btn-ghost"
							type="button"
							aria-disabled={running || resetting || undefined}
							aria-busy={resetting || undefined}
							onClick={change}
						>
							{t.restart}
						</button>
					</div>
				</section>
			) : null}

			{step === "done" && done ? (
				<section className="migrate-step" aria-labelledby={doneId}>
					<h2 id={doneId} ref={doneHead} tabIndex={-1}>
						{t.doneTitle}
					</h2>
					<p className="account-notice" role="status">
						{t.doneLede}
					</p>
					<ol className="migrate-steps">
						{t.doneSteps.map((line) => (
							<li key={line}>
								{line.replaceAll("{server}", serverName(done.to.server))}
							</li>
						))}
					</ol>
					{done.toIsBound ? (
						<p className="field-hint">{t.doneBound}</p>
					) : bound ? (
						<p className="field-hint">{t.doneBind}</p>
					) : null}
					<Link className="btn btn-ghost" href="/account" prefetch={false}>
						{t.back}
					</Link>
				</section>
			) : null}
		</section>
	);
}

function SignIn({
	slot,
	qr,
	otherBusy,
	note,
	onReady,
}: {
	slot: Slot;
	qr: TapQr;
	otherBusy: boolean;
	note?: string;
	onReady: (data: TapData) => boolean;
}) {
	const { m } = useI18n();
	const t = m.migrate;
	const ids = useId();
	const [token, setToken] = useState("");
	const [tokenBusy, setTokenBusy] = useState(false);
	const busy = qr.busy || otherBusy;

	const typed = token.trim();
	const tokenOk = new RegExp(`^[a-zA-Z0-9]{${TOKEN_LEN}}$`).test(typed);

	async function submitToken(e: FormEvent) {
		e.preventDefault();
		if (!tokenOk || busy) return;
		qr.setError(undefined);
		qr.setWaitingTap(false);
		if (qr.showQr) void qr.cancelQr();
		qr.setPhase("connecting");
		setTokenBusy(true);
		try {
			const res = await fetch(`/api/migrate/${slot}/token`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token: typed, server: qr.server }),
			});
			const { httpStatus, data } = await readJsonWithTapWait(res, () =>
				qr.setWaitingTap(true),
			);
			if (onReady(data)) {
				setToken("");
				return;
			}
			qr.fail(
				apiErrorText(
					{ status: httpStatus },
					data,
					m.errors.tapapi_unavailable,
					t.failed,
				),
			);
		} catch {
			qr.fail(t.failed);
		} finally {
			setTokenBusy(false);
		}
	}

	const column = {
		...qr,
		busy,
		startQr: async () => {
			if (!busy) await qr.startQr();
		},
	};
	const tokenCount = (
		tokenOk
			? m.bind.tokenReady
			: /[^a-zA-Z0-9]/.test(typed)
				? m.bind.tokenInvalid
				: typed.length > TOKEN_LEN
					? m.bind.tokenTooLong
					: m.bind.tokenNeeds
	).replaceAll("{n}", String(typed.length));
	const qrTitleId = `${ids}-qr`;
	const tokenTitleId = `${ids}-token`;
	const tokenHintId = `${ids}-token-hint`;
	const tokenCountId = `${ids}-token-count`;

	return (
		<>
			<TapServerSeg
				id={`${ids}-server`}
				server={qr.server}
				setServer={qr.setServer}
				disabled={qr.showQr || busy}
			/>
			{note ? <p className="migrate-note">{note}</p> : null}
			<div className="bind-methods">
				<TapQrColumn
					qr={column}
					titleId={qrTitleId}
					title={t.qrTitle}
					signingLabel={
						qr.phase === "connecting" && !tokenBusy && !otherBusy
							? t.connecting
							: undefined
					}
				/>
				<section className="bind-token-col" aria-labelledby={tokenTitleId}>
					<p className="bind-or" aria-hidden="true">
						{m.bind.or}
					</p>
					<h2 id={tokenTitleId}>{t.tokenTitle}</h2>
					<form className="bind-token" onSubmit={(e) => void submitToken(e)}>
						<label className="field field-col">
							<span className="field-label">{t.tokenLabel}</span>
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
							{t.tokenHint}
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
							aria-busy={tokenBusy || undefined}
							aria-describedby={tokenCountId}
						>
							{tokenBusy
								? qr.waitingTap
									? m.bind.waitingTap
									: t.connecting
								: t.tokenSubmit}
						</button>
					</form>
				</section>
			</div>
		</>
	);
}

function AccountCard({
	label,
	player,
	server,
	rks,
	action,
}: {
	label?: string;
	player?: string;
	server?: Server;
	rks?: number;
	action: ReactNode;
}) {
	const { m } = useI18n();
	const t = m.migrate;
	const name = player ? displayPlayerId(player) : "";
	return (
		<div className="migrate-account">
			<div className="migrate-account-info">
				{label ? <p className="migrate-account-label">{label}</p> : null}
				{name ? <p className="migrate-account-name">{name}</p> : null}
				{server || rks != null ? (
					<dl className="migrate-account-meta">
						{server ? (
							<div>
								<dt>{t.server}</dt>
								<dd>{server === "gb" ? m.bind.gb : m.bind.cn}</dd>
							</div>
						) : null}
						{rks != null ? (
							<div>
								<dt>{t.rks}</dt>
								<dd>{displayRks(rks)}</dd>
							</div>
						) : null}
					</dl>
				) : null}
			</div>
			{action}
		</div>
	);
}

function challengeText(
	rank: number | undefined,
	t: { none: string; challengeColors: string[] },
) {
	if (!rank) return t.none;
	const color = t.challengeColors[Math.floor(rank / 100)];
	return color ? `${color} ${rank % 100}` : String(rank);
}

function SideRow({
	label,
	view,
	cell,
}: {
	label: string;
	view: MigratePreview;
	cell: (side: SaveSide) => ReactNode;
}) {
	return (
		<tr>
			<th scope="row">{label}</th>
			<td>{cell(view.from)}</td>
			<td>{cell(view.to)}</td>
		</tr>
	);
}
