"use server";

import { signIn, signOut } from "@/auth";
import { safeNext } from "@/lib/safe-next";

export async function signOutAction() {
	await signOut({ redirectTo: "/" });
}

export async function signInDiscord(formData: FormData) {
	await signIn("discord", {
		redirectTo: safeNext(String(formData.get("next") || "")),
	});
}
