"use client";

import { X } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/provider";

export function ToolAlert({
	message,
	onDismiss,
}: {
	message: string;
	onDismiss: () => void;
}) {
	const { m } = useI18n();
	return (
		<div className="tool-pop tool-alert">
			<p role="alert">{message}</p>
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
