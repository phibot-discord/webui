"use client";

import { useEffect, useRef } from "react";

export function LandingStage() {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const stage = ref.current;
		const landing = stage?.parentElement;
		if (!stage || !landing) return;
		const still = window.matchMedia("(prefers-reduced-motion: reduce)");
		let stop: (() => void) | undefined;
		let run = 0;
		const start = () => {
			const mine = ++run;
			stop?.();
			stop = undefined;
			if (still.matches) return;
			import("@/components/landing/stage-scroll").then(({ mountStage }) => {
				if (mine === run && !still.matches) stop = mountStage(stage, landing);
			});
		};
		start();
		still.addEventListener("change", start);
		return () => {
			run++;
			still.removeEventListener("change", start);
			stop?.();
		};
	}, []);

	return <div ref={ref} className="stage" aria-hidden="true" />;
}
