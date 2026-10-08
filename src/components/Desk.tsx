"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { UnbindButton } from "@/components/UnbindButton";
import { formatDateTime } from "@/i18n/datetime";
import { useI18n } from "@/i18n/provider";

const noSubscribe = () => () => {};

function SyncTime({ iso }: { iso: string }) {
	const { locale, m } = useI18n();
	const client = useSyncExternalStore(
		noSubscribe,
		() => true,
		() => false,
	);
	const d = new Date(iso);
	if (!Number.isFinite(d.getTime())) return <>{iso}</>;
	if (!client) {
		return <time dateTime={iso}>{formatDateTime(iso, locale)} (UTC+8)</time>;
	}
	const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return (
		<time dateTime={iso} title={m.me.timeZone.replaceAll("{zone}", zone)}>
			{d.toLocaleString(locale === "zh" ? "zh-CN" : "en", {
				dateStyle: "medium",
				timeStyle: "short",
			})}
		</time>
	);
}

export function Desk({
	title,
	rks,
	lastSyncedIso,
	publicHint,
	note,
	tools,
	nav,
	children,
}: {
	title: string;
	rks?: string;
	lastSyncedIso?: string;
	publicHint?: boolean;
	note?: string;
	tools?: ReactNode;
	nav?: ReactNode;
	children?: ReactNode;
}) {
	const { m } = useI18n();
	return (
		<main id="content" className="page desk">
			<header className="desk-mast">
				<div className="desk-id">
					<h1 className="desk-name">{title}</h1>
					{rks != null ? (
						<p className="desk-meta">
							<span>
								<span className="meta-label">{m.me.rks}</span>{" "}
								<span className="meta-value">{rks}</span>
							</span>
							<span>
								<span className="meta-label">{m.me.lastSynced}</span>{" "}
								<span className="meta-value">
									{lastSyncedIso ? (
										<SyncTime iso={lastSyncedIso} />
									) : (
										m.me.cachedSave
									)}
								</span>
							</span>
						</p>
					) : null}
					{publicHint ? (
						<p className="desk-note">
							{m.public.hint}{" "}
							<Link className="desk-note-cta" href="/" prefetch={false}>
								{m.public.cta}
							</Link>
						</p>
					) : null}
				</div>
				{tools ? <div className="desk-tools">{tools}</div> : null}
			</header>
			{note ? <p className="desk-note desk-note-solo">{note}</p> : null}
			{nav}
			{children}
		</main>
	);
}

export function MeGate({
	reason,
	cooldown,
}: {
	reason: "banned" | "no_save";
	cooldown: number;
}) {
	const { m } = useI18n();
	if (reason === "banned") {
		return (
			<main id="content" className="page status-page desk-gate">
				<p className="status-code">{m.me.title}</p>
				<h1>{m.me.bannedTitle}</h1>
				<p className="lede">{m.me.banned}</p>
				<div className="status-actions">
					<Link className="btn btn-ghost" href="/" prefetch={false}>
						{m.error.home}
					</Link>
				</div>
			</main>
		);
	}
	return (
		<main id="content" className="page status-page desk-gate">
			<p className="status-code">{m.me.title}</p>
			<h1>{m.me.noSaveTitle}</h1>
			<p className="lede">{m.me.noSaveBody}</p>
			<div className="status-actions">
				<RefreshButton cooldownMs={cooldown} />
				<UnbindButton />
			</div>
		</main>
	);
}
