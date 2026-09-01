"use client";

import {
	type ButtonHTMLAttributes,
	type ReactNode,
	type RefObject,
	useEffect,
} from "react";

export function useToolDismiss(
	open: boolean,
	onClose: () => void,
	root: RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		if (!open) return;
		const onPointer = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) onClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open, onClose, root]);
}

export function SteadyButton({
	labels,
	children,
	className,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { labels: string[] }) {
	return (
		<button
			className={`btn btn-steady${className ? ` ${className}` : ""}`}
			{...props}
		>
			<span className="btn-steady-sizer" aria-hidden="true">
				{labels.map((label) => (
					<span key={label}>{label}</span>
				))}
			</span>
			<span className="btn-steady-live">{children}</span>
		</button>
	);
}

export function ToolPop({
	labelledBy,
	children,
}: {
	labelledBy?: string;
	children: ReactNode;
}) {
	return (
		<div
			className="tool-pop"
			role="dialog"
			aria-modal="false"
			aria-labelledby={labelledBy}
		>
			{children}
		</div>
	);
}
