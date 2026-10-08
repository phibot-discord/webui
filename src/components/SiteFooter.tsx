"use client";

import { Heart } from "@phosphor-icons/react";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";

const GITHUB = "https://github.com/YueMiyuki";

export function SiteFooter() {
	const { m } = useI18n();
	return (
		<footer className="site-foot">
			<div className="site-foot-inner">
				<p>
					{m.credit.before}
					<Heart
						className="site-foot-heart"
						weight="fill"
						size={14}
						role="img"
						aria-label={m.credit.heart}
					/>
					{m.credit.after}
					<a href={GITHUB} rel="noopener noreferrer" target="_blank">
						{m.credit.name}
					</a>
				</p>
				<nav className="site-foot-links" aria-label={m.legal.nav}>
					<Link href="/status">{m.status.title}</Link>
					<Link href="/tos">{m.legal.terms}</Link>
					<Link href="/privacy">{m.legal.privacy}</Link>
				</nav>
			</div>
		</footer>
	);
}
