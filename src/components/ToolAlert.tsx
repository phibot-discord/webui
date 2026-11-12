"use client";

import type { ReactNode } from "react";
import { X } from "@/components/icons";
import { useI18n } from "@/i18n/provider";

export function ToolAlert({
	message,
	onDismiss,
	tone,
	children,
}: {
	message: string;
	onDismiss: () => void;
	tone?: "note";
	children?: ReactNode;
}) {
	const { m } = useI18n();
	const note = tone === "note";
	return (
		<div
			className={note ? "tool-pop tool-alert tool-note" : "tool-pop tool-alert"}
		>
			<p role={note ? "status" : "alert"}>
				{message}
				{children}
			</p>
			<button
				type="button"
				className="btn btn-quiet btn-icon btn-sm"
				aria-label={m.refresh.dismiss}
				onClick={(e) => {
					const trigger = e.currentTarget
						.closest(".tool")
						?.querySelector<HTMLElement>(":scope > .btn");
					onDismiss();
					trigger?.focus();
				}}
			>
				<X aria-hidden="true" size={18} />
			</button>
		</div>
	);
}
