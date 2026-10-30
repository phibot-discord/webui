"use client";

import { useEffect, useId, useState } from "react";
import Link from "@/components/LocaleLink";
import { useI18n } from "@/i18n/provider";

export function CompareOptIn() {
	const { m } = useI18n();
	const t = m.compare;
	const hintId = useId();
	const [on, setOn] = useState(false);
	const [pending, setPending] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		const ac = new AbortController();
		fetch("/api/share/compare", { signal: ac.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(String(res.status));
				setOn(Boolean(((await res.json()) as { on?: unknown }).on));
			})
			.catch(() => {
				if (!ac.signal.aborted) setError(true);
			})
			.finally(() => {
				if (!ac.signal.aborted) setPending(false);
			});
		return () => ac.abort();
	}, []);

	async function change(next: boolean) {
		setPending(true);
		setError(false);
		try {
			const res = await fetch("/api/share/compare", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ on: next }),
			});
			if (!res.ok) throw new Error(String(res.status));
			setOn(next);
		} catch {
			setError(true);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="cmp-optin">
			<label className="opt-check">
				<input
					type="checkbox"
					checked={on}
					disabled={pending}
					aria-describedby={hintId}
					onChange={(e) => void change(e.target.checked)}
				/>
				<span className="cmp-optin-label">{t.optIn}</span>
			</label>
			<p className="tool-pop-copy" id={hintId}>
				{t.optInHint}
			</p>
			{error ? (
				<p className="field-error tool-pop-error" role="alert">
					{t.optInFailed}
				</p>
			) : null}
			<Link className="cmp-optin-link" href="/compare?a=me" prefetch={false}>
				{t.openCompare}
			</Link>
		</div>
	);
}
