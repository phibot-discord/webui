"use client";

import { GlobeSimple } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
	Announce,
	SteadyButton,
	ToolPop,
	useToolDismiss,
} from "@/components/Tool";
import { ToolAlert } from "@/components/ToolAlert";
import { useI18n } from "@/i18n/provider";

export function ShareToggle({ slug }: { slug?: string | null }) {
	const { m } = useI18n();
	const router = useRouter();
	const root = useRef<HTMLDivElement>(null);
	const field = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const hintId = useId();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
	const [error, setError] = useState<string>();
	const [liveSlug, setLiveSlug] = useState(slug || "");
	const [prevSlug, setPrevSlug] = useState(slug);
	if (slug !== prevSlug) {
		setPrevSlug(slug);
		setLiveSlug(slug || "");
	}
	const copiedTimer = useRef<number | undefined>(undefined);
	const close = useCallback(() => {
		if (!pending) setOpen(false);
	}, [pending]);
	useToolDismiss(open, close, root);

	useEffect(() => {
		return () => window.clearTimeout(copiedTimer.current);
	}, []);
	const path = liveSlug ? `/p/${liveSlug}` : "";

	async function enable() {
		setPending(true);
		setError(undefined);
		try {
			const res = await fetch("/api/share", { method: "POST" });
			const data = (await res.json().catch(() => ({}))) as {
				slug?: string;
				error?: string;
			};
			if (!res.ok || !data.slug) {
				setError(data.error || m.share.failed);
				return;
			}
			setLiveSlug(data.slug);
			setCopy("idle");
			setOpen(true);
			router.refresh();
		} catch {
			setError(m.share.failed);
		} finally {
			setPending(false);
		}
	}

	async function disable() {
		setPending(true);
		setError(undefined);
		try {
			const res = await fetch("/api/share", { method: "DELETE" });
			if (!res.ok) {
				setError(m.share.revokeFailed);
				return;
			}
			setLiveSlug("");
			setOpen(false);
			router.refresh();
		} catch {
			setError(m.share.revokeFailed);
		} finally {
			setPending(false);
		}
	}

	async function copyLink() {
		if (!liveSlug) return;
		window.clearTimeout(copiedTimer.current);
		try {
			await navigator.clipboard.writeText(field.current?.value ?? "");
			setCopy("copied");
			copiedTimer.current = window.setTimeout(() => setCopy("idle"), 2000);
		} catch {
			setCopy("failed");
			field.current?.focus();
			field.current?.select();
		}
	}

	return (
		<div className="tool" ref={root}>
			<SteadyButton
				className={
					liveSlug ? "btn-ghost share-btn is-on" : "btn-ghost share-btn"
				}
				type="button"
				aria-label={liveSlug ? `${m.share.menu}, ${m.share.on}` : undefined}
				aria-expanded={liveSlug ? open : undefined}
				aria-haspopup={liveSlug ? "dialog" : undefined}
				aria-disabled={pending || undefined}
				aria-busy={pending || undefined}
				labels={[m.share.menu, m.share.creating]}
				onClick={() => {
					if (pending) return;
					setError(undefined);
					if (liveSlug) setOpen((v) => !v);
					else void enable();
				}}
			>
				{liveSlug ? (
					<GlobeSimple aria-hidden="true" size={18} weight="bold" />
				) : null}
				{pending && !liveSlug ? m.share.creating : m.share.menu}
			</SteadyButton>
			{open && liveSlug ? (
				<ToolPop labelledBy={titleId}>
					<p className="tool-pop-title" id={titleId}>
						{m.share.link}
					</p>
					<p className="tool-pop-copy" id={hintId}>
						{m.share.hint}
					</p>
					<input
						ref={field}
						className="input share-url"
						type="text"
						readOnly
						value={`${window.location.origin}${path}`}
						aria-labelledby={titleId}
						aria-describedby={hintId}
						onFocus={(e) => e.currentTarget.select()}
					/>
					{copy === "failed" ? (
						<p className="field-error tool-pop-error" role="alert">
							{m.share.copyFailed}
						</p>
					) : null}
					{error ? (
						<p className="field-error tool-pop-error" role="alert">
							{error}
						</p>
					) : null}
					<div className="tool-pop-actions">
						<SteadyButton
							className="btn-ghost"
							type="button"
							labels={[m.share.copy, m.share.copied]}
							onClick={() => void copyLink()}
						>
							{copy === "copied" ? m.share.copied : m.share.copy}
						</SteadyButton>
						<a
							className="btn btn-ghost"
							href={path}
							target="_blank"
							rel="noopener"
						>
							{m.share.open}
						</a>
						<button
							className="btn btn-danger"
							type="button"
							disabled={pending}
							onClick={() => void disable()}
						>
							{m.share.revoke}
						</button>
					</div>
					<Announce>{copy === "copied" ? m.share.copied : ""}</Announce>
				</ToolPop>
			) : null}
			{error && !open ? (
				<ToolAlert message={error} onDismiss={() => setError(undefined)} />
			) : null}
		</div>
	);
}
