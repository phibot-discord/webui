"use client";

import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { apiErrorText } from "@/lib/api-error";

export function SessionTokenRow({ hasToken }: { hasToken: boolean }) {
	const { m } = useI18n();
	const t = m.account;
	const [token, setToken] = useState<string>();
	const [shown, setShown] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>();
	const busy = useRef(false);

	async function toggle() {
		if (shown) {
			setShown(false);
			return;
		}
		if (token) {
			setShown(true);
			return;
		}
		if (busy.current) return;
		busy.current = true;
		setLoading(true);
		setError(undefined);
		try {
			const res = await fetch("/api/me/token", { method: "POST" });
			const data = (await res.json().catch(() => ({}))) as {
				token?: string;
				error?: string;
				code?: string;
			};
			if (!res.ok || typeof data.token !== "string") {
				setError(
					apiErrorText(res, data, m.errors.tapapi_unavailable, t.tokenFailed),
				);
				return;
			}
			setToken(data.token);
			setShown(true);
		} catch {
			setError(t.tokenFailed);
		} finally {
			busy.current = false;
			setLoading(false);
		}
	}

	return (
		<li className="account-method">
			<div className="account-method-head">
				<h2>{t.sessionToken}</h2>
			</div>
			<p>{hasToken ? t.sessionTokenLede : t.sessionTokenNone}</p>
			{hasToken ? (
				<div className="account-token">
					<code className="account-token-value">
						{shown && token ? (
							token
						) : (
							<>
								<span aria-hidden="true">{"•".repeat(25)}</span>
								<span className="sr-only">{t.tokenHidden}</span>
							</>
						)}
					</code>
					<button
						className="btn btn-ghost btn-sm"
						type="button"
						aria-busy={loading || undefined}
						onClick={() => void toggle()}
					>
						{shown ? (
							<EyeSlash size={16} aria-hidden />
						) : (
							<Eye size={16} aria-hidden />
						)}
						{loading ? t.tokenLoading : shown ? t.tokenHide : t.tokenShow}
					</button>
				</div>
			) : null}
			{error ? (
				<p className="bind-error" role="alert">
					{error}
				</p>
			) : null}
		</li>
	);
}
