"use client";

import { type RefObject, useEffect, useState } from "react";

export function useWidth(ref: RefObject<HTMLElement | null>) {
	const [width, setWidth] = useState(0);
	useEffect(() => {
		const node = ref.current;
		if (!node || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(([entry]) => {
			setWidth(Math.round(entry?.contentRect.width ?? 0));
		});
		ro.observe(node);
		return () => ro.disconnect();
	}, [ref]);
	return width;
}
