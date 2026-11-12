import { type RefObject, useEffect, useState } from "react";

export type Enter = "wait" | "in" | null;

export function useEnter(ref: RefObject<HTMLElement | null>): Enter {
	const [enter, setEnter] = useState<Enter>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || typeof IntersectionObserver === "undefined") return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (el.getBoundingClientRect().top < window.innerHeight) return;
		setEnter("wait");
		const seen = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				seen.disconnect();
				setEnter("in");
			},
			{ rootMargin: "0px 0px -12% 0px" },
		);
		seen.observe(el);
		return () => seen.disconnect();
	}, [ref]);
	return enter;
}
