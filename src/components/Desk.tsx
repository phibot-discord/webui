import type { ReactNode } from "react";
import { RefreshButton } from "@/components/RefreshButton";
import { UnbindButton } from "@/components/UnbindButton";
import { getMessages } from "@/i18n/server";

export function displayPlayerId(raw: unknown): string {
	return String(raw || "player")
		.replace(/<[^>]+>/g, "")
		.trim();
}

export function displayRks(rks: unknown): string {
	return typeof rks === "number" ? rks.toFixed(4) : "-";
}

export function Desk({
	title,
	rks,
	rksLabel,
	synced,
	syncedLabel,
	note,
	tools,
	nav,
	toolbar,
	children,
}: {
	title: string;
	rks?: string;
	rksLabel?: string;
	synced?: string;
	syncedLabel?: string;
	note?: string;
	tools?: ReactNode;
	nav?: ReactNode;
	toolbar?: ReactNode;
	children?: ReactNode;
}) {
	const hasMeta = rks != null || synced != null;
	return (
		<main id="content" className="page desk">
			<header className="desk-mast">
				<div className="desk-id">
					<h1>{title}</h1>
					{hasMeta ? (
						<p className="desk-meta">
							{rks != null ? (
								<span>
									<span className="meta-label">{rksLabel}</span>
									<span className="meta-value">{rks}</span>
								</span>
							) : null}
							{synced != null ? (
								<span>
									<span className="meta-label">{syncedLabel}</span>
									<span className="meta-value">{synced}</span>
								</span>
							) : null}
						</p>
					) : null}
				</div>
				{tools ? <div className="desk-tools">{tools}</div> : null}
			</header>
			{note ? <p className="desk-note">{note}</p> : null}
			{nav}
			{toolbar}
			{children}
		</main>
	);
}

export async function MeGate({
	reason,
	cooldown,
}: {
	reason: "banned" | "no_save";
	cooldown: number;
}) {
	const { m } = await getMessages();
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
