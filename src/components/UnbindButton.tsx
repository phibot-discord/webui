"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { ToolPop, useToolDismiss } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";

export function UnbindButton() {
	const { m } = useI18n();
	const router = useRouter();
	const root = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const [confirming, setConfirming] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();
	const close = useCallback(() => {
		if (!pending) setConfirming(false);
	}, [pending]);
	useToolDismiss(confirming, close, root);

	async function unbind() {
		setPending(true);
		setError(undefined);
		try {
			const res = await fetch("/api/unbind", { method: "POST" });
			const data = (await res.json().catch(() => ({}))) as { error?: string };
			if (!res.ok) {
				setError(data.error || m.bind.unbindFailed);
				return;
			}
			router.refresh();
		} catch {
			setError(m.bind.unbindFailed);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="tool" ref={root}>
			<button
				className="btn btn-ghost"
				type="button"
				aria-expanded={confirming}
				aria-haspopup="dialog"
				disabled={pending}
				onClick={() => {
					setError(undefined);
					setConfirming((open) => !open);
				}}
			>
				{m.bind.unbind}
			</button>
			{confirming ? (
				<ToolPop labelledBy={titleId}>
					<p className="tool-pop-copy" id={titleId}>
						{m.bind.unbindConfirm}
					</p>
					{error ? (
						<p className="bind-error" role="alert">
							{error}
						</p>
					) : null}
					<div className="tool-pop-actions">
						<button
							className="btn btn-danger"
							type="button"
							disabled={pending}
							onClick={() => void unbind()}
						>
							{pending ? m.bind.unbinding : m.bind.unbindYes}
						</button>
						<button
							className="btn btn-ghost"
							type="button"
							disabled={pending}
							onClick={() => setConfirming(false)}
						>
							{m.bind.unbindNo}
						</button>
					</div>
				</ToolPop>
			) : null}
		</div>
	);
}
