"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ToolPop, useToolDismiss } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { persistCardReload } from "@/lib/save-refresh";

/** Unbinds TapTap, or in manual mode deletes the hand-typed scores; `inline` confirms in place */
export function UnbindButton({
	manual = false,
	inline = false,
}: {
	manual?: boolean;
	inline?: boolean;
}) {
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
	const trigger = useRef<HTMLButtonElement>(null);
	const confirmBox = useRef<HTMLFieldSetElement>(null);
	const titleId = useId();
	const boxId = useId();
	const [confirming, setConfirming] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();
	const close = useCallback(() => {
		if (!pending) setConfirming(false);
	}, [pending]);
	useToolDismiss(confirming && !inline, close, root);

	// Inline: move focus to the question so it is read before the buttons
	useEffect(() => {
		if (inline && confirming) confirmBox.current?.focus();
	}, [inline, confirming]);

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
			persistCardReload();
			router.refresh();
		} catch {
			setError(copy.failed);
		} finally {
			setPending(false);
		}
	}

	const question = (
		<p className="tool-pop-copy" id={titleId}>
			{copy.confirm}
		</p>
	);
	const body = (
		<>
			{error ? (
				<p className="field-error tool-pop-error" role="alert">
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
					onClick={() => {
						setConfirming(false);
						trigger.current?.focus();
					}}
				>
					{m.bind.unbindNo}
				</button>
			</div>
		</>
	);

	if (inline) {
		return (
			<div className="menu-item">
				<button
					ref={trigger}
					className="btn btn-ghost menu-btn menu-btn-danger"
					type="button"
					aria-expanded={confirming}
					aria-controls={confirming ? boxId : undefined}
					disabled={pending}
					onClick={() => {
						setError(undefined);
						setConfirming((open) => !open);
					}}
				>
					{copy.button}
				</button>
				{confirming ? (
					<fieldset
						ref={confirmBox}
						className="menu-confirm"
						id={boxId}
						tabIndex={-1}
					>
						<legend className="tool-pop-copy" id={titleId}>
							{copy.confirm}
						</legend>
						{body}
					</fieldset>
				) : null}
			</div>
		);
	}

	return (
		<div className="tool" ref={root}>
			<button
				ref={trigger}
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
					{question}
					{body}
				</ToolPop>
			) : null}
		</div>
	);
}
