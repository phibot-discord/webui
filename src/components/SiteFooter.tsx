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
				<div className="foot-cell foot-brand">
					<span className="foot-mark">{m.brand}</span>
					<span className="foot-value">{m.home.eyebrow}</span>
				</div>
				<dl className="foot-facts">
					<div className="foot-cell">
						<dt className="foot-label caps-label">{m.footer.credit}</dt>
						<dd className="foot-value">
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
						</dd>
					</div>
					{COMMIT ? (
						<div className="foot-cell">
							<dt className="foot-label caps-label">{m.footer.revision}</dt>
							<dd className="foot-value site-foot-rev" title={COMMIT}>
								{COMMIT.slice(0, 7)}
							</dd>
						</div>
					) : null}
				</dl>
				<nav className="foot-cell site-foot-links" aria-label={m.legal.nav}>
					<span className="foot-label caps-label" aria-hidden="true">
						{m.footer.more}
					</span>
					<div className="foot-links">
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
					</div>
				</nav>
			</div>
		</footer>
	);
}
