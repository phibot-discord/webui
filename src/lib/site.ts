export const SITE_ORIGIN = "https://phibot.dev";

/** Old hostnames that still serve the site but show the move notice */
const MOVED_HOSTS = new Set(["phi.yuemiyuki.dev"]);

export function isMovedHost(host: string): boolean {
	return MOVED_HOSTS.has(host.replace(/:\d*$/, "").toLowerCase());
}

export const PHIRA_MP_SERVER = "phira.phibot.dev:12346";
