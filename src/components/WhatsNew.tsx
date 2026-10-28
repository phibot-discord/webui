"use client";

import { Coffee, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/LocaleLink";
import type { Locale } from "@/i18n/config";
import { formatDay } from "@/i18n/datetime";
import { useI18n } from "@/i18n/provider";
import {
	CHANGELOG,
	CHANGELOG_EVENT,
	type ChangeRelease,
	type ChangeSection,
	markSeen,
	readSeen,
	shouldOpen,
} from "@/lib/changelog";
import { stripLocale } from "@/lib/locale-path";

const COFFEE_URL = "https://buymeacoffee.com/yuemiyuki";
const SHOW_DELAY_MS = 900;

export function WhatsNew({ auto = true }: { auto?: boolean }) {
	const { m, locale } = useI18n();
	const t = m.notice;
	const path = usePathname();
	const titleId = useId();
	const ref = useRef<HTMLDialogElement>(null);
	const ok = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [releases, setReleases] = useState<ChangeRelease[] | null>(null);
	const bare = stripLocale(path);
	const shared = bare.startsWith("/p/") || bare.startsWith("/render/");

	useEffect(() => {
		if (!auto || shared || !shouldOpen(readSeen())) return;
		const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [auto, shared]);

	useEffect(() => {
		const show = () => setOpen(true);
		window.addEventListener(CHANGELOG_EVENT, show);
		return () => window.removeEventListener(CHANGELOG_EVENT, show);
	}, []);

	useEffect(() => {
		if (!open || releases) return;
		void import("@/lib/changelog-sections").then((mod) =>
			setReleases(mod.CHANGELOG_RELEASES),
		);
	}, [open, releases]);

	useEffect(() => {
		const node = ref.current;
		if (!open || !releases || !node) return;
		if (!node.open) node.showModal();
		ok.current?.focus({ preventScroll: true });
		const closed = () => {
			markSeen();
			setOpen(false);
		};
		node.addEventListener("close", closed);
		return () => {
			node.removeEventListener("close", closed);
			if (node.open) node.close();
		};
	}, [open, releases]);

	if (!open || !releases) return null;

	const close = () => ref.current?.close();
	const date = formatDay(CHANGELOG.date, locale);
	const [latest, ...older] = releases;

	return (
		<dialog ref={ref} className="whats-new" aria-labelledby={titleId}>
			<header className="whats-new-head">
				<div>
					<h2 className="whats-new-title" id={titleId}>
						{t.title}
					</h2>
					<p className="whats-new-date">
						<time dateTime={CHANGELOG.date}>{date}</time>
					</p>
				</div>
				<button
					className="btn btn-quiet btn-icon btn-sm"
					type="button"
					aria-label={t.close}
					title={t.close}
					onClick={close}
				>
					<X size={16} weight="bold" aria-hidden />
				</button>
			</header>
			<div className="whats-new-body">
				{latest ? (
					<Sections sections={latest.sections} locale={locale} onPick={close} />
				) : null}
				{older.length ? (
					<>
						<p className="whats-new-earlier">{t.earlier}</p>
						{older.map((release) => (
							<details key={release.date} className="whats-new-older">
								<summary>
									<time dateTime={release.date}>
										{formatDay(release.date, locale)}
									</time>
								</summary>
								<Sections
									sections={release.sections}
									locale={locale}
									onPick={close}
								/>
							</details>
						))}
					</>
				) : null}
			</div>
			<footer className="whats-new-foot">
				<a
					className="btn btn-ghost btn-sm"
					href={COFFEE_URL}
					rel="noopener noreferrer"
					target="_blank"
				>
					<Coffee size={16} weight="fill" aria-hidden />
					{t.coffee}
				</a>
				<button
					ref={ok}
					className="btn btn-primary btn-sm"
					type="button"
					onClick={close}
				>
					{t.dismiss}
				</button>
			</footer>
		</dialog>
	);
}

function Sections({
	sections,
	locale,
	onPick,
}: {
	sections: ChangeSection[];
	locale: Locale;
	onPick: () => void;
}) {
	return sections.map((section) => (
		<section key={section.heading.en} className="whats-new-section">
			<h3>{section.heading[locale]}</h3>
			<ul>
				{section.items.map((item) => (
					<li key={item.en}>
						{item.href ? (
							<Link href={item.href} prefetch={false} onClick={onPick}>
								{item[locale]}
							</Link>
						) : (
							item[locale]
						)}
					</li>
				))}
			</ul>
		</section>
	));
}
