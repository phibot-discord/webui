"use client";

import { useFormStatus } from "react-dom";
import { useI18n } from "@/i18n/provider";

export function LinkDiscordButton() {
	const { m } = useI18n();
	const { pending } = useFormStatus();
	return (
		<button
			className="btn btn-primary"
			type="submit"
			aria-busy={pending || undefined}
		>
			{pending ? m.home.signingIn : m.account.linkDiscord}
		</button>
	);
}
