"use client";

import type { ReactNode } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { UnbindButton } from "@/components/UnbindButton";
import { formatDateTime } from "@/i18n/datetime";
import { useI18n } from "@/i18n/provider";

export function Desk({
	title,
	rks,
	lastSyncedIso,
	publicHint,
	note,
	tools,
	nav,
	toolbar,
	children,
}: {
	title: string;
	rks?: string;
	lastSyncedIso?: string;
	publicHint?: boolean;
	note?: string;
	tools?: ReactNode;
	nav?: ReactNode;
	toolbar?: ReactNode;
	children?: ReactNode;
}) {
	const { locale, m } = useI18n();
	const hasMeta = rks != null;
	const syncedText = lastSyncedIso
		? formatDateTime(lastSyncedIso, locale)
		: m.me.cachedSave;
	const hint = publicHint ? m.public.hint : note;
	return (
		<main id="content" className="page desk">
			<header className="desk-mast">
				<div className="desk-id">
					<h1>{title}</h1>
					{hasMeta ? (
						<p className="desk-meta">
							<span>
								<span className="meta-label">{m.me.rks}</span>
								<span className="meta-value">{rks}</span>
							</span>
							<span>
								<span className="meta-label">{m.me.lastSynced}</span>
								<span className="meta-value">{syncedText}</span>
							</span>
						</p>
					) : null}
				</div>
				{tools ? <div className="desk-tools">{tools}</div> : null}
			</header>
			{hint ? <p className="desk-note">{hint}</p> : null}
			{nav}
			{toolbar}
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
			<main id="content" className="page desk">
				<h1>{m.me.title}</h1>
				<div className="callout">
					<p>{m.me.banned}</p>
				</div>
			</main>
		);
	}
	return (
		<main id="content" className="page desk">
			<h1>{m.me.title}</h1>
			<p className="desk-note">{m.errors.no_save}</p>
			<div className="desk-tools">
				<RefreshButton cooldownMs={cooldown} />
				<UnbindButton />
			</div>
		</main>
	);
}
