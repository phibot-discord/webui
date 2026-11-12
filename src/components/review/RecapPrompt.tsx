"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "@/components/LocaleLink";
import { useHydrated } from "@/components/Tool";
import { useHeaderSession } from "@/components/useHeaderSession";
import { useI18n } from "@/i18n/provider";
import { stripLocale } from "@/lib/locale-path";
import {
	cachedReady,
	cacheReady,
	markRecapSeen,
	recapSeen,
} from "@/lib/recap-note";
import {
	REVIEW_PATH,
	REVIEW_YEAR,
	reviewLinked,
	reviewWindow,
} from "@/lib/review-window";
import { fill } from "@/phi/lib/card-i18n";

async function askReady(): Promise<boolean> {
	const day = new Date().toISOString().slice(0, 10);
	const cached = cachedReady(day);
	if (cached !== undefined) return cached;
	try {
		const res = await fetch("/api/recap", { cache: "no-store" });
		if (!res.ok) return false;
		const ready = (await res.json()).ready === true;
		cacheReady(day, ready);
		return ready;
	} catch {
		return false;
	}
}

export function RecapPrompt() {
	const { m } = useI18n();
	const t = m.wrapped.prompt;
	const hydrated = useHydrated();
	const session = useHeaderSession();
	const here = stripLocale(usePathname()) === REVIEW_PATH;
	const [ready, setReady] = useState(false);
	const signedIn = session.signedIn;

	useEffect(() => {
		if (here) {
			markRecapSeen();
			setReady(false);
			return;
		}
		if (!signedIn || recapSeen()) return;
		const open = reviewLinked(
			reviewWindow(Date.now(), { NODE_ENV: process.env.NODE_ENV }),
		);
		if (!open) return;
		let gone = false;
		void askReady().then((answer) => {
			if (!gone) setReady(answer);
		});
		return () => {
			gone = true;
		};
	}, [here, signedIn]);

	if (!hydrated || !ready || here || !signedIn) return null;
	const done = () => {
		markRecapSeen();
		setReady(false);
	};
	return (
		<aside
			className="toast-card recap-prompt"
			aria-label={fill(m.wrapped.page, { year: REVIEW_YEAR })}
		>
			<span className="recap-prompt-cards" aria-hidden="true">
				<i />
				<i />
				<i />
			</span>
			<p className="toast-card-text">{fill(t.ready, { year: REVIEW_YEAR })}</p>
			<div className="toast-card-actions">
				<Link
					className="btn btn-sm toast-card-go"
					href={REVIEW_PATH}
					prefetch={false}
					onClick={done}
				>
					{t.open}
				</Link>
				<button type="button" className="btn btn-ghost btn-sm" onClick={done}>
					{t.later}
				</button>
			</div>
		</aside>
	);
}
