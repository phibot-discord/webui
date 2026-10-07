"use client";

import { CaretDown, DotsThree } from "@phosphor-icons/react";
import { type ReactNode, useCallback, useId, useRef, useState } from "react";
import { ToolPop, useToolDismiss } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";

/**
 * The desk's secondary actions (bypass cache, unbind) behind one trigger, so
 * the masthead keeps a single row on phones
 */
export function MoreMenu({ children }: { children: ReactNode }) {
	const { m } = useI18n();
	const root = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const [open, setOpen] = useState(false);
	const close = useCallback(() => setOpen(false), []);
	useToolDismiss(open, close, root);

	return (
		<div className="tool" ref={root}>
			{/* Phones show only the dots; the label stays for screen readers */}
			<button
				className="btn btn-ghost more-btn"
				type="button"
				aria-expanded={open}
				aria-haspopup="dialog"
				onClick={() => setOpen((v) => !v)}
			>
				<DotsThree
					className="more-icon"
					aria-hidden="true"
					size={22}
					weight="bold"
				/>
				<span className="more-label">{m.me.more}</span>
				<CaretDown className="btn-caret" aria-hidden="true" size={14} />
			</button>
			{open ? (
				<ToolPop labelledBy={titleId}>
					<p className="tool-pop-title" id={titleId}>
						{m.me.moreLabel}
					</p>
					<div className="menu-list">{children}</div>
				</ToolPop>
			) : null}
		</div>
	);
}
