"use client";

import { useHydrated } from "@/components/Tool";
import { type NavGroup, navGroupsAt } from "@/lib/nav";

export function useNavGroups(): NavGroup[] {
	const client = useHydrated();
	return navGroupsAt(client ? Date.now() : null, {
		NODE_ENV: process.env.NODE_ENV,
	});
}
