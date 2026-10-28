"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";

export function FigureFrame({
	className,
	slot,
	children,
}: {
	className: string;
	slot?: string;
	children: ReactNode;
}) {
	const ref = useRef<HTMLElement>(null);
	const on = useRef<string | null>(null);

	const mark = (id: string | null) => {
		const fig = ref.current;
		if (!fig || id === on.current) return;
		on.current = id;
		fig.toggleAttribute("data-active", id !== null);
		for (const node of fig.querySelectorAll("[data-part]"))
			node.toggleAttribute("data-on", node.getAttribute("data-part") === id);
	};

	const over = (e: PointerEvent) => {
		const hit = (e.target as Element).closest("[data-part]");
		mark(hit?.getAttribute("data-part") ?? null);
	};

	return (
		<figure
			ref={ref}
			className={className}
			data-stage-slot={slot}
			onPointerOver={over}
			onPointerLeave={() => mark(null)}
		>
			{children}
		</figure>
	);
}
