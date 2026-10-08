"use client";

import {
	type ButtonHTMLAttributes,
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
} from "react";

export function useToolDismiss(
	open: boolean,
	onClose: () => void,
	root: RefObject<HTMLElement | null>,
) {
	useEffect(() => {
		if (!open) return;
		const node = root.current;
		const onPointer = (e: PointerEvent) => {
			if (!root.current?.contains(e.target as Node)) onClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		const onFocusOut = (e: FocusEvent) => {
			const next = e.relatedTarget as Node | null;
			if (next && !root.current?.contains(next)) onClose();
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		node?.addEventListener("focusout", onFocusOut);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
			node?.removeEventListener("focusout", onFocusOut);
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
	const ref = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const pop = ref.current;
		if (!pop) return;
		const before = document.activeElement;
		const trigger =
			before instanceof HTMLElement &&
			before !== document.body &&
			!pop.contains(before)
				? before
				: (pop.parentElement?.querySelector<HTMLElement>("[aria-expanded]") ??
					null);
		pop.focus({ preventScroll: true });
		const restore = () => {
			if (trigger?.isConnected) trigger.focus({ preventScroll: true });
		};
		return () => {
			const active = document.activeElement;
			if (active && pop.contains(active)) {
				restore();
				return;
			}
			if (active && active !== document.body) return;
			requestAnimationFrame(() => {
				const now = document.activeElement;
				if (!now || now === document.body) restore();
			});
		};
	}, []);

	return (
		<div
			ref={ref}
			className="tool-pop"
			role="dialog"
			aria-modal="false"
			aria-labelledby={labelledBy}
			tabIndex={-1}
		>
			{children}
		</div>
	);
}

export function Announce({ children }: { children?: ReactNode }) {
	return (
		<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
			{children}
		</p>
	);
}
