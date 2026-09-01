"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useEffect } from "react";
import { useI18n } from "@/i18n/provider";
import { setTheme } from "@/theme/actions";
import { isTheme, THEME_COOKIE, type Theme } from "@/theme/config";

function readTheme(): Theme {
	const attr = document.documentElement.getAttribute("data-theme");
	if (isTheme(attr)) return attr;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(next: Theme) {
	const root = document.documentElement;
	root.setAttribute("data-theme", next);
	root.style.colorScheme = next;
	document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function ThemeSwitch() {
	const { m } = useI18n();

	useEffect(() => {
		applyTheme(readTheme());
	}, []);

	function toggle() {
		const next: Theme = readTheme() === "light" ? "dark" : "light";
		applyTheme(next);
		void setTheme(next);
	}

	return (
		<button
			type="button"
			className="theme-switch"
			onClick={toggle}
			aria-label={m.theme.label}
		>
			<Sun
				className="theme-icon theme-icon-sun"
				size={18}
				weight="regular"
				aria-hidden
			/>
			<Moon
				className="theme-icon theme-icon-moon"
				size={18}
				weight="regular"
				aria-hidden
			/>
		</button>
	);
}
