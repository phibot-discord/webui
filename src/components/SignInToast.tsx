"use client";

import { useEffect, useState } from "react";
import { LockSimple, X } from "@/components/icons";
import { useI18n } from "@/i18n/provider";

const STAY_MS = 10_000;
const TICK_MS = 500;

export function SignInToast() {
	const { m } = useI18n();
	const [shown, setShown] = useState(true);

	useEffect(() => {
		if (!shown) return;
		let seen = 0;
		const timer = window.setInterval(() => {
			if (document.hidden || document.querySelector("dialog[open]")) return;
			seen += TICK_MS;
			if (seen >= STAY_MS) setShown(false);
		}, TICK_MS);
		return () => window.clearInterval(timer);
	}, [shown]);

	if (!shown) return null;
	return (
		<aside className="toast-card toast-card-plain" role="status">
			<LockSimple size={22} weight="bold" aria-hidden />
			<p className="toast-card-text">{m.toast.signIn}</p>
			<button
				type="button"
				className="toast-card-close"
				aria-label={m.notice.close}
				title={m.notice.close}
				onClick={() => setShown(false)}
			>
				<X size={18} weight="bold" aria-hidden />
			</button>
		</aside>
	);
}
