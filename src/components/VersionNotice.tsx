"use client";

import { Coffee, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

const NOTICE_ID = "vercel-pro-regions";
const STORAGE_KEY = `phi-notice:${NOTICE_ID}`;
const COFFEE_URL = "https://buymeacoffee.com/yuemiyuki";
/** Let the page settle before the note slides in */
const SHOW_DELAY_MS = 1200;

function remember() {
	try {
		window.localStorage.setItem(STORAGE_KEY, "1");
	} catch {}
}

/** One-time non-modal toast; reserves room so it never hides content, Escape dismisses */
export function VersionNotice() {
	const { m } = useI18n();
	const path = usePathname();
	const titleId = useId();
	const ref = useRef<HTMLElement>(null);
	const [open, setOpen] = useState(false);
	const shared = path.startsWith("/p/");

	useEffect(() => {
		if (shared) return;
		try {
			if (window.localStorage.getItem(STORAGE_KEY)) return;
		} catch {
			return;
		}
		const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [shared]);

	useEffect(() => {
		const node = ref.current;
		if (!open || !node) return;
		const root = document.documentElement;
		const measure = () => {
			const bottom = Number.parseFloat(getComputedStyle(node).bottom) || 0;
			root.style.setProperty(
				"--toast-space",
				`${Math.ceil(node.offsetHeight + bottom)}px`,
			);
		};
		// Capture phase: runs before an open menu or popover closes, so their
		// Escape is not also taken as dismissing this note
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			const inside = node.contains(document.activeElement);
			if (!inside && document.querySelector('[aria-expanded="true"]')) return;
			remember();
			setOpen(false);
		};
		measure();
		const sized = new ResizeObserver(measure);
		sized.observe(node);
		window.addEventListener("resize", measure);
		document.addEventListener("keydown", onKey, true);
		return () => {
			sized.disconnect();
			window.removeEventListener("resize", measure);
			document.removeEventListener("keydown", onKey, true);
			root.style.removeProperty("--toast-space");
		};
	}, [open]);

	function dismiss() {
		remember();
		setOpen(false);
	}

	if (!open || shared) return null;

	return (
		<aside ref={ref} className="version-notice" aria-labelledby={titleId}>
			<div className="version-notice-head">
				<h2 className="version-notice-title" id={titleId}>
					{m.notice.title}
				</h2>
				<button
					className="btn btn-quiet btn-icon btn-sm version-notice-close"
					type="button"
					aria-label={m.notice.close}
					title={m.notice.close}
					onClick={dismiss}
				>
					<X size={16} weight="bold" aria-hidden />
				</button>
			</div>
			<p className="version-notice-body">{m.notice.body}</p>
			<div className="version-notice-actions">
				<a
					className="btn btn-primary btn-sm"
					href={COFFEE_URL}
					rel="noopener noreferrer"
					target="_blank"
					onClick={dismiss}
				>
					<Coffee size={16} weight="fill" aria-hidden />
					{m.notice.coffee}
				</a>
				<button
					className="btn btn-ghost btn-sm"
					type="button"
					onClick={dismiss}
				>
					{m.notice.dismiss}
				</button>
			</div>
		</aside>
	);
}
