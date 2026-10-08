"use client";

import { useI18n } from "@/i18n/provider";

export function focusMain(): boolean {
	const main = document.getElementById("content");
	if (!main) return false;
	if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
	main.focus({ preventScroll: true });
	return true;
}

export function SkipLink() {
	const { m } = useI18n();
	return (
		// biome-ignore lint/a11y/useValidAnchor: a real link; onClick also moves focus into the page
		<a
			className="skip"
			href="#content"
			onClick={(e) => {
				if (!focusMain()) return;
				e.preventDefault();
				document.getElementById("content")?.scrollIntoView({ block: "start" });
			}}
		>
			{m.skip}
		</a>
	);
}
