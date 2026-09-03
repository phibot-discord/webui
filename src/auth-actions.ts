"use server";

import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { withBoundAuthUrl } from "@/lib/auth-url";
import { safeNext } from "@/lib/safe-next";

export async function signOutAction() {
	await withBoundAuthUrl(await headers(), () => signOut({ redirectTo: "/" }));
}

export async function signInDiscord(formData: FormData) {
	await withBoundAuthUrl(await headers(), () =>
		signIn("discord", {
			redirectTo: safeNext(String(formData.get("next") || "")),
		}),
	);
}
