"use client";

import { Heart } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/provider";
import { adoptStoredRefresh, markRefresh } from "@/lib/asset-refresh";
import { CHANGELOG_EVENT } from "@/lib/changelog";

const GITHUB = "https://github.com/YueMiyuki";
const COMMIT = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "";

export function SiteFooter() {
	const { m } = useI18n();
	useEffect(() => adoptStoredRefresh(), []);
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
					{COMMIT ? (
						<span className="site-foot-rev" title={COMMIT}>
							{COMMIT.slice(0, 7)}
						</span>
					) : null}
				</p>
				<nav className="site-foot-links" aria-label={m.legal.nav}>
					<button
						type="button"
						aria-haspopup="dialog"
						onClick={() => window.dispatchEvent(new Event(CHANGELOG_EVENT))}
					>
						{m.notice.open}
					</button>
					<button
						type="button"
						title={m.assetRefresh.hint}
						onClick={() => {
							markRefresh();
							window.location.reload();
						}}
					>
						{m.assetRefresh.label}
					</button>
					<Link href="/status">{m.status.title}</Link>
					<Link href="/tos">{m.legal.terms}</Link>
					<Link href="/privacy">{m.legal.privacy}</Link>
				</nav>
			</div>
		</footer>
	);
}
