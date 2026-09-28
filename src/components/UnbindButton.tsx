"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { ToolPop, useToolDismiss } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";

/** Unbinds TapTap, or in manual mode deletes the hand-typed scores */
export function UnbindButton({ manual = false }: { manual?: boolean }) {
	const { m } = useI18n();
	const copy = manual
		? {
				button: m.manual.clear,
				confirm: m.manual.clearConfirm,
				yes: m.manual.clear,
				pending: m.manual.clearing,
				failed: m.manual.clearFailed,
			}
		: {
				button: m.bind.unbind,
				confirm: m.bind.unbindConfirm,
				yes: m.bind.unbindYes,
				pending: m.bind.unbinding,
				failed: m.bind.unbindFailed,
			};
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
				setError(data.error || copy.failed);
				return;
			}
			router.refresh();
		} catch {
			setError(copy.failed);
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
				{copy.button}
			</button>
			{confirming ? (
				<ToolPop labelledBy={titleId}>
					<p className="tool-pop-copy" id={titleId}>
						{copy.confirm}
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
							{pending ? copy.pending : copy.yes}
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
