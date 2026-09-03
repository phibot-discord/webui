"use client";

import { Coffee } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

const NOTICE_ID = "vercel-pro-regions";
const STORAGE_KEY = `phi-notice:${NOTICE_ID}`;
const COFFEE_URL = "https://buymeacoffee.com/yuemiyuki";

export function VersionNotice() {
	const { m } = useI18n();
	const dialog = useRef<HTMLDialogElement>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		try {
			if (window.localStorage.getItem(STORAGE_KEY)) return;
		} catch {
			return;
		}
		setOpen(true);
	}, []);

	useEffect(() => {
		const node = dialog.current;
		if (!node) return;
		if (open && !node.open) node.showModal();
		if (!open && node.open) node.close();
	}, [open]);

	function dismiss() {
		try {
			window.localStorage.setItem(STORAGE_KEY, "1");
		} catch {}
		setOpen(false);
	}

	if (!open) return null;

	return (
		<dialog
			ref={dialog}
			className="version-notice"
			aria-labelledby="version-notice-title"
			onCancel={(e) => {
				e.preventDefault();
				dismiss();
			}}
		>
			<p id="version-notice-title" className="version-notice-body">
				{m.notice.body}
			</p>
			<div className="version-notice-actions">
				<a
					className="btn btn-primary"
					href={COFFEE_URL}
					rel="noopener noreferrer"
					target="_blank"
				>
					<Coffee size={16} weight="fill" aria-hidden />
					{m.notice.coffee}
				</a>
				<button className="btn btn-ghost" type="button" onClick={dismiss}>
					{m.notice.dismiss}
				</button>
			</div>
		</dialog>
	);
}
