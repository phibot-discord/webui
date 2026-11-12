"use client";

import { ArrowUpRight } from "@/components/icons";
import { useI18n } from "@/i18n/provider";

const APP_ID = "1543272274952724590";

const INVITES = {
	server: `https://discord.com/oauth2/authorize?client_id=${APP_ID}&permissions=8584986789675007&scope=bot+applications.commands`,
	user: `https://discord.com/oauth2/authorize?client_id=${APP_ID}&integration_type=1&scope=applications.commands`,
} as const;

export function InviteLink({
	className,
	kind = "server",
}: {
	className: string;
	kind?: keyof typeof INVITES;
}) {
	const { m } = useI18n();
	return (
		<a
			className={className}
			href={INVITES[kind]}
			rel="noopener noreferrer"
			target="_blank"
			title={kind === "user" ? m.inviteUserHint : undefined}
		>
			{kind === "user" ? m.inviteUser : m.invite}
			<ArrowUpRight size={16} aria-hidden="true" />
			<span className="sr-only"> ({m.home.newTab})</span>
		</a>
	);
}
