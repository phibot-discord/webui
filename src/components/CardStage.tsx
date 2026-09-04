"use client";

import { useCallback, useState } from "react";
import { CardViewer } from "@/components/CardViewer";
import { CountSelect } from "@/components/CountSelect";
import { useI18n } from "@/i18n/provider";
import { bumpCardReload } from "@/lib/save-refresh";
import { type CardKind, clampCount } from "@/server/card-kinds";

function withQuery(srcBase: string, opts: { count?: number; locale: string }) {
	const u = new URL(srcBase, "http://local.invalid");
	if (opts.count != null) u.searchParams.set("count", String(opts.count));
	u.searchParams.set("locale", opts.locale);
	return `${u.pathname}${u.search}`;
}

export function CardStage({
	kind,
	srcBase,
	counted,
	initialCount,
	tagProfile,
}: {
	kind: CardKind;
	srcBase: string;
	counted: boolean;
	initialCount: number;
	tagProfile?: { on: boolean };
}) {
	const { locale, m } = useI18n();
	const [count, setCount] = useState(initialCount);
	const src = withQuery(srcBase, {
		count: counted ? count : undefined,
		locale,
	});
	const title = m.card.titles[kind];

	const onCount = useCallback((next: number) => {
		const n = clampCount(String(next));
		setCount(n);
		const url = new URL(window.location.href);
		url.searchParams.set("count", String(n));
		window.history.replaceState(null, "", `${url.pathname}${url.search}`);
	}, []);

	return (
		<>
			<div className="toolbar">
				{counted ? <CountSelect value={count} onChange={onCount} /> : null}
				{tagProfile ? (
					<TagProfileToggle
						initialOn={tagProfile.on}
						label={m.card.tagProfile}
					/>
				) : null}
				<a className="btn btn-ghost" href={src} download={`${kind}.png`}>
					{m.card.download}
				</a>
			</div>
			<CardViewer src={src} alt={m.card.alt.replaceAll("{name}", title)} />
		</>
	);
}

function TagProfileToggle({
	initialOn,
	label,
}: {
	initialOn: boolean;
	label: string;
}) {
	const [on, setOn] = useState(initialOn);
	const [pending, setPending] = useState(false);

	async function toggle() {
		const next = !on;
		setPending(true);
		try {
			const res = await fetch("/api/notes", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ showTagAnalysis: next }),
			});
			if (!res.ok) return;
			setOn(next);
			bumpCardReload();
		} finally {
			setPending(false);
		}
	}

	return (
		<button
			className="btn btn-ghost"
			type="button"
			aria-pressed={on}
			disabled={pending}
			onClick={() => void toggle()}
		>
			{label}
		</button>
	);
}
