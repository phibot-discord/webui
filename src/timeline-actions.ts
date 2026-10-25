"use server";

import { isLocale } from "@/i18n/config";
import type { EventDetails, TermDetails, ThreadDetails } from "@/lib/timeline";
import { timelineDetails } from "@/server/timeline";

/** Runs in the files page's own function, so it reads the view that page just built */
export async function loadTimelineDetails(
	lang: string,
	community: boolean,
	kind: "event" | "term" | "thread",
	id: string,
): Promise<EventDetails | TermDetails | ThreadDetails | undefined> {
	if (!isLocale(lang) || !["event", "term", "thread"].includes(kind)) return;
	if (typeof id !== "string" || !id || id.length > 120) return;
	return timelineDetails(lang, community === true, { kind, id });
}
