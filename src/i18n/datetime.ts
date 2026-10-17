import { type Locale, localeTag } from "./config";

/** A `YYYY-MM-DD` day in the site language, e.g. "October 8, 2026" */
export function formatDay(day: string, locale: Locale): string {
	return new Intl.DateTimeFormat(localeTag(locale), {
		dateStyle: "long",
		timeZone: "UTC",
	}).format(new Date(`${day}T00:00:00Z`));
}

export function formatDateTime(iso: string, locale: Locale): string {
	const d = new Date(iso);
	if (!Number.isFinite(d.getTime())) return iso;
	return d.toLocaleString(locale === "zh" ? "zh-CN" : "en", {
		timeZone: "Asia/Shanghai",
		dateStyle: "medium",
		timeStyle: "short",
	});
}
