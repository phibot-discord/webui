"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Announce, SteadyButton } from "@/components/Tool";
import { useI18n } from "@/i18n/provider";
import { BADGE_STYLES, type BadgeStyle, badgeSnippets } from "@/lib/badge";

export function BadgeSnippet({ slug }: { slug: string }) {
	const { m } = useI18n();
	const t = m.badge;
	const titleId = useId();
	const hintId = useId();
	const styleId = useId();
	const field = useRef<HTMLTextAreaElement>(null);
	const timer = useRef<number | undefined>(undefined);
	const [style, setStyle] = useState<BadgeStyle>("flat");
	const [copied, setCopied] = useState<"md" | "html" | undefined>();
	const snippets = badgeSnippets(window.location.origin, slug, style);

	useEffect(() => () => window.clearTimeout(timer.current), []);

	async function copy(kind: "md" | "html") {
		window.clearTimeout(timer.current);
		try {
			await navigator.clipboard.writeText(
				kind === "md" ? snippets.markdown : snippets.html,
			);
			setCopied(kind);
			timer.current = window.setTimeout(() => setCopied(undefined), 2000);
		} catch {
			field.current?.focus();
			field.current?.select();
		}
	}

	return (
		<section className="badge-snippet" aria-labelledby={titleId}>
			<p className="tool-pop-title" id={titleId}>
				{t.title}
			</p>
			<p className="tool-pop-copy" id={hintId}>
				{t.hint}
			</p>
			<div className="badge-style">
				<label className="field-label" htmlFor={styleId}>
					{t.styleLabel}
				</label>
				<select
					id={styleId}
					className="input"
					value={style}
					onChange={(e) => setStyle(e.target.value as BadgeStyle)}
				>
					{BADGE_STYLES.map((s) => (
						<option key={s} value={s}>
							{t.styles[s]}
						</option>
					))}
				</select>
			</div>
			{/* biome-ignore lint/performance/noImgElement: SVG from our own API, changes with the style picker */}
			<img
				className="badge-preview"
				data-style={style}
				src={snippets.image}
				alt={t.alt}
			/>
			<textarea
				ref={field}
				className="input badge-code"
				readOnly
				rows={2}
				value={snippets.markdown}
				aria-labelledby={titleId}
				aria-describedby={hintId}
				onFocus={(e) => e.currentTarget.select()}
			/>
			<div className="tool-pop-actions">
				<SteadyButton
					className="btn-ghost"
					type="button"
					labels={[t.copy, t.copied]}
					onClick={() => void copy("md")}
				>
					{copied === "md" ? t.copied : t.copy}
				</SteadyButton>
				<SteadyButton
					className="btn-ghost"
					type="button"
					labels={[t.copyHtml, t.copied]}
					onClick={() => void copy("html")}
				>
					{copied === "html" ? t.copied : t.copyHtml}
				</SteadyButton>
			</div>
			<Announce>{copied ? t.copied : ""}</Announce>
		</section>
	);
}
