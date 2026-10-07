"use client";

import { Check } from "@phosphor-icons/react";
import {
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { comboboxKey } from "@/components/ChartSearch";
import { OptStatus } from "@/components/SegRadio";
import { useI18n } from "@/i18n/provider";
import { looseFold } from "@/lib/song-search";

export type BackgroundOption = { id: string; song: string };

/** Editable combobox over ~330 illustrations, "Random" first */
export function BackgroundPicker({
	options,
	value,
	onChange,
	status,
	error,
}: {
	options: BackgroundOption[];
	value: string;
	onChange: (next: string) => void;
	status?: string;
	error?: string;
}) {
	const { m } = useI18n();
	const labelId = useId();
	const listId = useId();
	const root = useRef<HTMLDivElement>(null);
	const input = useRef<HTMLInputElement>(null);
	const [editing, setEditing] = useState(false);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(-1);

	const all = useMemo(
		() => [{ id: "", song: m.card.backgroundRandom }, ...options],
		[options, m.card.backgroundRandom],
	);
	const folded = looseFold(query);
	const hits = useMemo(
		() =>
			folded
				? options.filter(
						(o) =>
							looseFold(o.song).includes(folded) ||
							looseFold(o.id).includes(folded),
					)
				: all,
		[all, options, folded],
	);
	const current = all.find((o) => o.id === value) ?? {
		id: "",
		song: m.card.backgroundRandom,
	};
	const expanded = editing && hits.length > 0;
	const optionId = (i: number) => `${listId}-${i}`;
	const activeId = expanded && active >= 0 ? optionId(active) : undefined;

	useEffect(() => {
		if (activeId) {
			document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
		}
	}, [activeId]);

	const stop = () => {
		setEditing(false);
		setQuery("");
		setActive(-1);
	};

	const pick = (id: string) => {
		stop();
		if (id !== value) onChange(id);
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.nativeEvent.isComposing) return;
		const action = comboboxKey(e.key, e.altKey, {
			expanded,
			active,
			count: hits.length,
			hasQuery: query !== "",
		});
		if (!action) return;
		if (!action.keepDefault) e.preventDefault();
		if (action.pick) {
			const hit = hits[active];
			if (hit) pick(hit.id);
			return;
		}
		if (action.clear) setQuery("");
		if (action.open === false) {
			// Escape on a closed list: drop the search and show the choice again
			if (e.key === "Escape") stop();
			else setActive(-1);
		}
		if (action.open) setEditing(true);
		if (action.active !== undefined) setActive(action.active);
	};

	return (
		<div className="opt opt-bg" ref={root}>
			<p className="opt-label" id={labelId}>
				{m.card.background}
				<OptStatus>{status}</OptStatus>
			</p>
			<div className="bg-picker">
				<input
					ref={input}
					className="input bg-input"
					type="text"
					role="combobox"
					autoComplete="off"
					spellCheck={false}
					aria-labelledby={labelId}
					aria-autocomplete="list"
					aria-controls={listId}
					aria-expanded={expanded}
					aria-activedescendant={activeId}
					aria-invalid={error ? true : undefined}
					placeholder={editing ? m.card.backgroundSearch : undefined}
					value={editing ? query : current.song}
					onFocus={() => {
						setEditing(true);
						setActive(-1);
					}}
					onBlur={(e) => {
						if (!root.current?.contains(e.relatedTarget as Node | null)) stop();
					}}
					onChange={(e) => {
						setEditing(true);
						setQuery(e.target.value);
						setActive(-1);
					}}
					onKeyDown={onKeyDown}
				/>
				<ul
					className="bg-list"
					id={listId}
					// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML allows ul[role=listbox]
					role="listbox"
					aria-labelledby={labelId}
					tabIndex={-1}
					hidden={!expanded}
					// Keep focus in the input while an option is clicked
					onMouseDown={(e) => e.preventDefault()}
				>
					{expanded
						? hits.map((o, i) => (
								// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: aria-activedescendant pattern, keys stay on the input
								<li
									key={o.id || "random"}
									id={optionId(i)}
									// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA in HTML allows li[role=option]
									role="option"
									aria-selected={i === active}
									// The check mark is only drawn: say which one is in use
									aria-label={
										o.id === value
											? `${o.song}, ${m.card.backgroundCurrent}`
											: undefined
									}
									data-current={o.id === value || undefined}
									className={i === active ? "is-active" : undefined}
									onClick={() => pick(o.id)}
								>
									<span>{o.song}</span>
									{o.id === value ? (
										<Check aria-hidden="true" size={16} weight="bold" />
									) : null}
								</li>
							))
						: null}
				</ul>
				<span className="sr-only" role="status">
					{editing && folded
						? hits.length
							? m.card.backgroundResults.replaceAll("{n}", String(hits.length))
							: m.card.backgroundNone
						: ""}
				</span>
			</div>
			{error ? (
				<p className="field-error opt-error" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
