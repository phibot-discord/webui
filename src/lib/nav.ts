import { CARD_KINDS, CARD_PAGES, TOOL_PAGES } from "@/server/card-kinds";

export type NavGroupId = "tools" | "scores" | "files";

export type NavItemId =
	| (typeof CARD_KINDS)[number]
	| (typeof CARD_PAGES)[number]["id"]
	| (typeof TOOL_PAGES)[number]["id"]
	| "score"
	| "songs"
	| "phira"
	| "guess"
	| "compare"
	| "files"
	| "pv"
	| "collection"
	| "timeline"
	| "texts";

export type NavItem = { id: NavItemId; href: string; match: string[] };
export type NavGroup = { id: NavGroupId; items: NavItem[] };

const page = (id: NavItemId, href: string, match = [href]): NavItem => ({
	id,
	href,
	match,
});

export const NAV_GROUPS: NavGroup[] = [
	{
		id: "tools",
		items: [
			page("score", "/score"),
			...TOOL_PAGES.map((p) => page(p.id, p.href)),
			page("songs", "/songs"),
			page("phira", "/phira", ["/phira", "/phira-mp"]),
			page("guess", "/guess"),
		],
	},
	{
		id: "scores",
		items: [
			...CARD_KINDS.map((kind) => page(kind, `/me/${kind}`)),
			...CARD_PAGES.map((p) => page(p.id, p.href)),
			page("compare", "/compare"),
		],
	},
	{
		id: "files",
		items: [
			page("files", "/files", []),
			page("pv", "/files?view=pv", []),
			page("collection", "/files?view=collection", []),
			page("timeline", "/files?view=timeline", []),
			page("texts", "/files?view=texts", []),
		],
	},
];

export const GROUP_MATCH: Record<NavGroupId, string[]> = {
	tools: NAV_GROUPS[0]?.items.flatMap((i) => i.match) ?? [],
	scores: ["/me", ...(NAV_GROUPS[1]?.items.flatMap((i) => i.match) ?? [])],
	files: ["/files"],
};

export function isHere(path: string, match: readonly string[]): boolean {
	return match.some((href) => path === href || path.startsWith(`${href}/`));
}

export function currentGroup(path: string): NavGroupId | undefined {
	return (Object.keys(GROUP_MATCH) as NavGroupId[]).find((id) =>
		isHere(path, GROUP_MATCH[id]),
	);
}
