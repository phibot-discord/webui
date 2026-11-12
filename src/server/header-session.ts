import type { Session } from "next-auth";
import type { HeaderSession } from "@/lib/header-session";
import { avatarPath } from "./avatar";

export function headerSession(session: Session | null): HeaderSession {
	const user = session?.user;
	if (!user?.id) return { signedIn: false, name: null, image: null };
	return {
		signedIn: true,
		name: user.name ?? null,
		image: avatarPath(user.image) ?? null,
	};
}
