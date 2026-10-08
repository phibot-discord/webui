"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import { useI18n } from "@/i18n/provider";

const BOT_INVITE =
	"https://discord.com/oauth2/authorize?client_id=1543272274952724590&permissions=8584986789675007&scope=bot+applications.commands";

export function InviteLink({ className }: { className: string }) {
	const { m } = useI18n();
	return (
		<a
			className={className}
			href={BOT_INVITE}
			rel="noopener noreferrer"
			target="_blank"
		>
			{m.invite}
			<ArrowUpRight size={16} aria-hidden="true" />
			<span className="sr-only"> ({m.home.newTab})</span>
		</a>
	);
}
