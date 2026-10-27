import type { Bilingual } from "@/i18n/config";
import { readLocal, writeLocal } from "./local-store";

export type ChangeItem = Bilingual & { href?: string };
export type ChangeSection = { heading: Bilingual; items: ChangeItem[] };
export type ChangeRelease = { date: string; sections: ChangeSection[] };
export type Changelog = { version: string; date: string };

export const CHANGELOG: Changelog = {
	version: "2026-10-27.1",
	date: "2026-10-27",
};

const STORAGE_KEY = "phi-notice:whats-new";
/** Dispatched on window to open the dialog, as the footer link does */
export const CHANGELOG_EVENT = "phi:whats-new";

/** `seen` is the version last dismissed; undefined when storage is unavailable, which never opens it by itself */
export function shouldOpen(
	seen: string | null | undefined,
	version = CHANGELOG.version,
): boolean {
	return seen !== undefined && seen !== version;
}

export function readSeen(): string | null | undefined {
	return readLocal(STORAGE_KEY);
}

export function markSeen(version = CHANGELOG.version): void {
	writeLocal(STORAGE_KEY, version);
}
