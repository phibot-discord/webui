"use client";

import { ArrowRight, X } from "@phosphor-icons/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { useI18n } from "@/i18n/provider";
import { readSession, writeSession } from "@/lib/local-store";
import { stripLocale } from "@/lib/locale-path";
import { SITE_ORIGIN } from "@/lib/site";

const PROMPT_KEY = "phi-domain-move";

const markPromptSeen = () => writeSession(PROMPT_KEY, "1");

export function DomainMove({ signedIn }: { signedIn: boolean }) {
	const { m } = useI18n();
	const t = m.domainMove;
	const path = usePathname();
	const query = useSearchParams().toString();
	const target = `${SITE_ORIGIN}${path}${query ? `?${query}` : ""}`;
	const titleId = useId();
	const ref = useRef<HTMLDialogElement>(null);
	const go = useRef<HTMLAnchorElement>(null);
	const render = stripLocale(path).startsWith("/render/");
	const shared = stripLocale(path).startsWith("/p/");

	useEffect(() => {
		const node = ref.current;
		if (render || shared || !node || readSession(PROMPT_KEY) === "1") return;
		if (!node.open) node.showModal();
		go.current?.focus({ preventScroll: true });
		node.addEventListener("close", markPromptSeen, { once: true });
	}, [render, shared]);

	if (render) return null;

	const close = () => ref.current?.close();

	return (
		<>
			<aside className="domain-move" aria-label={t.label}>
				<p>
					<span>
						{t.text}
						{signedIn ? ` ${t.signIn}` : null}
					</span>
					<a href={target}>
						{t.go}
						<ArrowRight size={14} weight="bold" aria-hidden />
					</a>
				</p>
			</aside>
			<dialog ref={ref} className="whats-new" aria-labelledby={titleId}>
				<header className="whats-new-head">
					<h2 className="whats-new-title" id={titleId}>
						{t.title}
					</h2>
					<button
						className="btn btn-quiet btn-icon btn-sm"
						type="button"
						aria-label={m.notice.close}
						title={m.notice.close}
						onClick={close}
					>
						<X size={16} weight="bold" aria-hidden />
					</button>
				</header>
				<div className="whats-new-body domain-move-body">
					<p>{t.text}</p>
					{signedIn ? <p>{t.signIn}</p> : null}
				</div>
				<footer className="whats-new-foot">
					<button
						className="btn btn-ghost btn-sm"
						type="button"
						onClick={close}
					>
						{t.stay}
					</button>
					<a ref={go} className="btn btn-primary btn-sm" href={target}>
						{t.go}
						<ArrowRight size={16} weight="bold" aria-hidden />
					</a>
				</footer>
			</dialog>
		</>
	);
}
