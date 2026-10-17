"use client";

import { Coffee, X } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatDay } from "@/i18n/datetime";
import { useI18n } from "@/i18n/provider";
import {
	CHANGELOG,
	CHANGELOG_EVENT,
	type ChangeSection,
	markSeen,
	readSeen,
	shouldOpen,
} from "@/lib/changelog";

const COFFEE_URL = "https://buymeacoffee.com/yuemiyuki";
const SHOW_DELAY_MS = 900;

export function WhatsNew() {
	const { m, locale } = useI18n();
	const t = m.notice;
	const path = usePathname();
	const titleId = useId();
	const ref = useRef<HTMLDialogElement>(null);
	const ok = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const [sections, setSections] = useState<ChangeSection[] | null>(null);
	const shared = path.startsWith("/p/") || path.startsWith("/render/");

	useEffect(() => {
		if (shared || !shouldOpen(readSeen())) return;
		const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
		return () => window.clearTimeout(timer);
	}, [shared]);

	useEffect(() => {
		const show = () => setOpen(true);
		window.addEventListener(CHANGELOG_EVENT, show);
		return () => window.removeEventListener(CHANGELOG_EVENT, show);
	}, []);

	useEffect(() => {
		if (!open || sections) return;
		void import("@/lib/changelog-sections").then((mod) =>
			setSections(mod.CHANGELOG_SECTIONS),
		);
	}, [open, sections]);

	useEffect(() => {
		const node = ref.current;
		if (!open || !sections || !node) return;
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
	}, [open, sections]);

	if (!open || !sections) return null;

	const close = () => ref.current?.close();
	const date = formatDay(CHANGELOG.date, locale);

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
				{sections.map((section) => (
					<section key={section.heading.en} className="whats-new-section">
						<h3>{section.heading[locale]}</h3>
						<ul>
							{section.items.map((item) => (
								<li key={item.en}>
									{item.href ? (
										<Link href={item.href} prefetch={false} onClick={close}>
											{item[locale]}
										</Link>
									) : (
										item[locale]
									)}
								</li>
							))}
						</ul>
					</section>
				))}
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
