"use client";

import {
	useEffect,
	useId,
	useLayoutEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { Desktop, Moon, Sun } from "@/components/icons";
import { useI18n } from "@/i18n/provider";
import {
	THEME_COLORS,
	THEME_COOKIE,
	type Theme,
	type ThemeChoice,
	themeFromCookie,
} from "@/theme/config";

const OPTIONS = [
	{ value: "light", Icon: Sun },
	{ value: "dark", Icon: Moon },
	{ value: "system", Icon: Desktop },
] as const;

const DARK_QUERY = "(prefers-color-scheme: dark)";

const noSubscribe = () => () => {};

function savedChoice(): ThemeChoice {
	return themeFromCookie(document.cookie) ?? "system";
}

function syncThemeColor(theme: Theme | null) {
	const dark = window.matchMedia(DARK_QUERY).matches;
	const scheme = document.querySelector<HTMLMetaElement>(
		'meta[name="color-scheme"]',
	);
	if (scheme) scheme.content = theme ?? "dark light";
	for (const meta of document.querySelectorAll<HTMLMetaElement>(
		'meta[name="theme-color"]',
	)) {
		const media = meta.getAttribute("media") ?? "";
		const own: Theme = media.includes("light")
			? "light"
			: media.includes("dark")
				? "dark"
				: dark
					? "dark"
					: "light";
		meta.content = THEME_COLORS[theme ?? own];
	}
}

function applyTheme(choice: ThemeChoice) {
	const root = document.documentElement;
	if (choice === "system") {
		root.removeAttribute("data-theme");
		root.style.removeProperty("color-scheme");
		// biome-ignore lint/suspicious/noDocumentCookie: not httpOnly; Cookie Store is not universal
		document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
		syncThemeColor(null);
		return;
	}
	root.setAttribute("data-theme", choice);
	root.style.colorScheme = choice;
	// biome-ignore lint/suspicious/noDocumentCookie: not httpOnly; Cookie Store is not universal
	document.cookie = `${THEME_COOKIE}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax`;
	syncThemeColor(choice);
}

export function ThemeSwitch() {
	const { m } = useI18n();
	const labelId = useId();
	const saved = useSyncExternalStore(
		noSubscribe,
		savedChoice,
		() => "system" as const,
	);
	const [picked, setPicked] = useState<ThemeChoice | null>(null);
	const choice = picked ?? saved;
	const names: Record<ThemeChoice, string> = {
		light: m.theme.light,
		dark: m.theme.dark,
		system: m.theme.system,
	};

	useLayoutEffect(() => {
		const theme = themeFromCookie(document.cookie);
		if (theme) {
			document.documentElement.setAttribute("data-theme", theme);
			document.documentElement.style.colorScheme = theme;
		}
		syncThemeColor(theme);
	}, []);

	useEffect(() => {
		if (choice !== "system") return;
		const query = window.matchMedia(DARK_QUERY);
		const follow = () => syncThemeColor(null);
		query.addEventListener("change", follow);
		return () => query.removeEventListener("change", follow);
	}, [choice]);

	function pick(next: ThemeChoice) {
		if (next === choice) return;
		applyTheme(next);
		setPicked(next);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: a <fieldset> legend cannot sit inline in the flex row, so this is a labelled group
		<div className="switch theme-switch" role="group" aria-labelledby={labelId}>
			<span className="switch-label" id={labelId}>
				{m.theme.label}
			</span>
			<span className="switch-options">
				{OPTIONS.map(({ value, Icon }) => (
					<button
						key={value}
						type="button"
						aria-pressed={choice === value}
						title={names[value]}
						onClick={() => pick(value)}
					>
						<Icon size={18} weight="regular" aria-hidden />
						<span className="switch-text">{names[value]}</span>
					</button>
				))}
			</span>
		</div>
	);
}
