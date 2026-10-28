"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { SyncTime } from "@/components/Desk";
import Link from "@/components/LocaleLink";
import { Announce, SteadyButton } from "@/components/Tool";
import {
	TapQrColumn,
	TapServerSeg,
	TapTokenColumn,
	useTapQr,
} from "@/components/useTapQr";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";
import { displayPlayerId, displayRks } from "@/lib/player-display";
import { persistCardReload } from "@/lib/save-refresh";
import { readJsonWithTapWait, tapWaitFailed } from "@/lib/tap-wait";
import type {
	BoundAccount,
	MigratePreview,
	SaveSide,
	Server,
	Slot,
} from "@/server/migrate";

type Step = "from" | "to" | "review" | "done";
type Done = { to: SaveSide; toIsBound: boolean; bindOffer?: "ask" | "tap" };
type Asked = "bound" | "skipped";
type TapQr = ReturnType<typeof useTapQr<"connecting">>;
type TapData = Awaited<ReturnType<typeof readJsonWithTapWait>>["data"];

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

function serverLabel(bind: { cn: string; gb: string }, server: Server) {
	return server === "gb" ? bind.gb : bind.cn;
}

async function connectVia(
	qr: TapQr,
	send: () => Promise<Response>,
	onReady: (data: TapData) => boolean,
	failed: string,
	unavailable: string,
): Promise<boolean> {
	qr.setError(undefined);
	qr.setWaitingTap(false);
	if (qr.showQr) void qr.cancelQr();
	qr.setPhase("connecting");
	try {
		const { httpStatus, data } = await readJsonWithTapWait(await send(), () =>
			qr.setWaitingTap(true),
		);
		if (onReady(data)) return true;
		qr.fail(apiErrorText({ status: httpStatus }, data, unavailable, failed));
	} catch {
		qr.fail(failed);
	}
	return false;
}

const focusOnMount = (el: HTMLElement | null) => {
	el?.focus();
};

export function MigratePanel({
	bound,
	tapOpens,
}: {
	bound?: BoundAccount;
	tapOpens: boolean;
}) {
	const { m } = useI18n();
	const t = m.migrate;
	const ids = useId();
	const [from, setFrom] = useState<SaveSide>();
	const [view, setView] = useState<MigratePreview>();
	const [done, setDone] = useState<Done>();
	const [asked, setAsked] = useState<Asked>();
	const [changed, setChanged] = useState(false);
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
	const step: Step = done ? "done" : view ? "review" : from ? "to" : "from";
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
		const heads = {
			from: fromHead,
			to: toHead,
			review: reviewHead,
			done: doneHead,
		};
		heads[step].current?.focus();
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
	}

	function showPreview(next: MigratePreview) {
		setView(next);
		setChanged(false);
		setRunError(undefined);
		setUntil(Date.now() + WAIT_S * 1000);
		setLeft(WAIT_S);
		settle(toQr);
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
		setAsked(undefined);
		setChanged(false);
		setRunError(undefined);
		setUntil(0);
		if (error) fromQr.setError(error);
		setResetting(false);
	}

	function change() {
		if (running || resetting || toQr.busy) return;
		void reset();
	}

	async function connectBound() {
		if (fromQr.busy || resetting) return;
		setBoundBusy(true);
		await connectVia(
			fromQr,
			() => fetch("/api/migrate/bound", { method: "POST" }),
			(data) => ready("from", data),
			t.failed,
			m.errors.tapapi_unavailable,
		);
		setBoundBusy(false);
	}

	async function run() {
		if (!view || left > 0 || running || resetting) return;
		setRunError(undefined);
		setChanged(false);
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
				const offer = data.bindOffer;
				setDone({
					to,
					toIsBound: data.toIsBound === true,
					bindOffer: offer === "ask" || offer === "tap" ? offer : undefined,
				});
				return;
			}
			const next = asPreview(data.preview);
			if (data.code === "migrate_changed" && next) {
				showPreview(next);
				setChanged(true);
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
					{changed ? (
						<p className="account-notice" role="status">
							{t.changed}
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
									label={m.bind.server}
									view={view}
									cell={(s) => serverLabel(m.bind, s.server)}
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
								{line.replaceAll(
									"{server}",
									serverLabel(m.bind, done.to.server),
								)}
							</li>
						))}
					</ol>
					{asked === "bound" ? (
						<p ref={focusOnMount} className="account-notice" tabIndex={-1}>
							{t.bindDone}
						</p>
					) : done.toIsBound ? (
						<p className="field-hint">{t.doneBound}</p>
					) : done.bindOffer === "tap" ? (
						<p className="field-hint">{t.bindTap}</p>
					) : done.bindOffer === "ask" && !asked ? (
						<BindAsk
							switching={Boolean(bound)}
							tapOpens={tapOpens}
							onBound={() => setAsked("bound")}
							onSkip={() => {
								setAsked("skipped");
								doneHead.current?.focus();
							}}
						/>
					) : bound ? (
						<p className="field-hint">{t.doneBind}</p>
					) : null}
					<div className="migrate-actions">
						{asked === "bound" ? (
							<Link className="btn btn-primary" href="/me/b30" prefetch={false}>
								{m.home.openDesk}
							</Link>
						) : null}
						<Link className="btn btn-ghost" href="/account" prefetch={false}>
							{t.back}
						</Link>
					</div>
				</section>
			) : null}
		</section>
	);
}

function BindAsk({
	switching,
	tapOpens,
	onBound,
	onSkip,
}: {
	switching: boolean;
	tapOpens: boolean;
	onBound: () => void;
	onSkip: () => void;
}) {
	const { m } = useI18n();
	const t = m.migrate;
	const titleId = useId();
	const [binding, setBinding] = useState(false);
	const [waitingTap, setWaitingTap] = useState(false);
	const [error, setError] = useState<{ text: string; expired: boolean }>();

	async function bind() {
		if (binding) return;
		setBinding(true);
		setWaitingTap(false);
		setError(undefined);
		try {
			const res = await fetch("/api/migrate/bind", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ confirm: true }),
			});
			const { httpStatus, data } = await readJsonWithTapWait(res, () =>
				setWaitingTap(true),
			);
			if (!tapWaitFailed(res, data) && data.status === "bound") {
				persistCardReload();
				onBound();
				return;
			}
			const text = apiErrorText(
				{ status: httpStatus },
				data,
				m.errors.tapapi_unavailable,
				t.bindFailed,
			);
			setError({ text, expired: data.code === "migrate_bind_expired" });
		} catch {
			setError({ text: t.bindFailed, expired: false });
		} finally {
			setBinding(false);
			setWaitingTap(false);
		}
	}

	function skip() {
		if (binding) return;
		void fetch("/api/migrate/reset", { method: "POST" }).catch(() => undefined);
		onSkip();
	}

	if (error?.expired)
		return (
			<p ref={focusOnMount} className="migrate-note" tabIndex={-1}>
				{error.text}
			</p>
		);

	return (
		<section className="migrate-ask" aria-labelledby={titleId}>
			<h3 id={titleId}>{t.bindTitle}</h3>
			<p>{switching ? t.bindSwitch : t.bindNew}</p>
			{tapOpens ? <p>{t.bindTapMoves}</p> : null}
			<Announce>
				{binding ? (waitingTap ? m.bind.waitingTap : m.bind.binding) : ""}
			</Announce>
			{error ? (
				<p className="bind-error" role="alert">
					{error.text}
				</p>
			) : null}
			<div className="migrate-actions">
				<SteadyButton
					className="btn-primary"
					type="button"
					labels={[t.bindYes, m.bind.binding]}
					aria-disabled={binding || undefined}
					aria-busy={binding || undefined}
					onClick={() => void bind()}
				>
					{binding ? m.bind.binding : t.bindYes}
				</SteadyButton>
				<button
					className="btn btn-ghost"
					type="button"
					aria-disabled={binding || undefined}
					onClick={skip}
				>
					{t.bindNo}
				</button>
			</div>
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
	const [tokenBusy, setTokenBusy] = useState(false);
	const busy = qr.busy || otherBusy;

	async function submitToken(token: string) {
		setTokenBusy(true);
		const ok = await connectVia(
			qr,
			() =>
				fetch(`/api/migrate/${slot}/token`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token, server: qr.server }),
				}),
			onReady,
			t.failed,
			m.errors.tapapi_unavailable,
		);
		setTokenBusy(false);
		return ok;
	}

	const column = {
		...qr,
		busy,
		startQr: async () => {
			if (!busy) await qr.startQr();
		},
	};

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
					titleId={`${ids}-qr`}
					title={m.tapLogin.qrTitle}
					signingLabel={
						qr.phase === "connecting" && !tokenBusy && !otherBusy
							? t.connecting
							: undefined
					}
				/>
				<TapTokenColumn
					title={m.bind.tokenTitle}
					hint={t.tokenHint}
					submitLabel={t.tokenSubmit}
					submittingLabel={t.connecting}
					submitting={tokenBusy}
					waitingTap={qr.waitingTap}
					busy={busy}
					onSubmit={submitToken}
				/>
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
								<dt>{m.bind.server}</dt>
								<dd>{serverLabel(m.bind, server)}</dd>
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
