import { bareId } from "./chart-catalog";

export function songSlug(id: string): string {
	return bareId(id).replaceAll(".", "-");
}

export function songPath(id: string): string {
	return `/songs/${encodeURIComponent(songSlug(id))}`;
}
