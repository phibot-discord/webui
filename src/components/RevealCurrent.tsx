"use client";

import { useEffect, useRef } from "react";
import { revealIn } from "@/lib/scroll";

export function RevealCurrent({
	current,
	within,
}: {
	current: string | undefined;
	within: string;
}) {
	const marker = useRef<HTMLSpanElement>(null);
	const smooth = useRef(false);

	useEffect(() => {
		if (!current) return;
		const box = marker.current?.closest<HTMLElement>(within);
		const target =
			marker.current?.parentElement?.querySelector<HTMLElement>(
				"[aria-current]",
			);
		if (box && target) revealIn(box, target, smooth.current);
		smooth.current = true;
	}, [current, within]);

	return <span ref={marker} hidden />;
}
