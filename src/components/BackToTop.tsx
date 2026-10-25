"use client";

import { ArrowUp } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { focusMain } from "./SkipLink";

const LONG = 2.5;
const SHOW_AFTER = 1.2;

export function BackToTop() {
	const { m } = useI18n();
	const [shown, setShown] = useState(false);
	const button = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		let frame = 0;
		const update = () => {
			frame = 0;
			const view = window.innerHeight;
			const long = document.documentElement.scrollHeight > view * LONG;
			const next = long && window.scrollY > view * SHOW_AFTER;
			if (!next && document.activeElement === button.current) focusMain();
			setShown(next);
		};
		const onChange = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		update();
		const resize = new ResizeObserver(onChange);
		resize.observe(document.body);
		window.addEventListener("scroll", onChange, { passive: true });
		window.addEventListener("resize", onChange);
		return () => {
			resize.disconnect();
			window.removeEventListener("scroll", onChange);
			window.removeEventListener("resize", onChange);
			if (frame) cancelAnimationFrame(frame);
		};
	}, []);

	return (
		<button
			ref={button}
			type="button"
			className="back-to-top"
			data-shown={shown ? "" : undefined}
			onClick={() => {
				const reduce = window.matchMedia(
					"(prefers-reduced-motion: reduce)",
				).matches;
				window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
				focusMain();
			}}
		>
			<ArrowUp aria-hidden="true" size={20} weight="bold" />
			<span className="sr-only">{m.backToTop}</span>
		</button>
	);
}
