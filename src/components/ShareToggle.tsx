"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SteadyButton, ToolPop, useToolDismiss } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";

export function ShareToggle({ slug }: { slug?: string | null }) {
	const { m } = useI18n();
	const router = useRouter();
	const root = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [copied, setCopied] = useState(false);
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
		try {
			const res = await fetch("/api/share", { method: "POST" });
			const data = (await res.json().catch(() => ({}))) as { slug?: string };
			if (res.ok && data.slug) {
				setLiveSlug(data.slug);
				setOpen(true);
			}
			router.refresh();
		} finally {
			setPending(false);
		}
	}

	async function disable() {
		setPending(true);
		try {
			const res = await fetch("/api/share", { method: "DELETE" });
			if (res.ok) {
				setLiveSlug("");
				setOpen(false);
				router.refresh();
			}
		} finally {
			setPending(false);
		}
	}

	async function copy() {
		if (!liveSlug) return;
		await navigator.clipboard.writeText(
			`${window.location.origin}/p/${liveSlug}`,
		);
		setCopied(true);
		window.clearTimeout(copiedTimer.current);
		copiedTimer.current = window.setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="tool" ref={root}>
			<SteadyButton
				className="btn-ghost"
				type="button"
				aria-expanded={open}
				aria-haspopup="dialog"
				aria-pressed={Boolean(liveSlug) || undefined}
				disabled={pending}
				labels={[m.share.menu, m.share.creating]}
				onClick={() => {
					if (liveSlug) setOpen((v) => !v);
					else void enable();
				}}
			>
				{pending && !liveSlug ? m.share.creating : m.share.menu}
			</SteadyButton>
			{open && liveSlug ? (
				<ToolPop labelledBy={titleId}>
					<p className="tool-pop-copy" id={titleId}>
						{m.share.link}
					</p>
					<p className="share-url">{path}</p>
					<div className="tool-pop-actions">
						<SteadyButton
							className="btn-ghost"
							type="button"
							labels={[m.share.copy, m.share.copied]}
							onClick={() => void copy()}
						>
							{copied ? m.share.copied : m.share.copy}
						</SteadyButton>
						<button
							className="btn btn-danger"
							type="button"
							disabled={pending}
							onClick={() => void disable()}
						>
							{m.share.revoke}
						</button>
					</div>
				</ToolPop>
			) : null}
		</div>
	);
}
