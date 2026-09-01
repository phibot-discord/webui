import type { Locale } from "./config";

export function formatDateTime(iso: string, locale: Locale): string {
	const d = new Date(iso);
	if (!Number.isFinite(d.getTime())) return iso;
	return d.toLocaleString(locale === "zh" ? "zh-CN" : "en", {
		timeZone: "Asia/Shanghai",
		dateStyle: "medium",
		timeStyle: "short",
	});
}
