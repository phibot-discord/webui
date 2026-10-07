"use client";

import { Fragment, type ReactNode, useId } from "react";

export type SegOption<T extends string | number> = {
	value: T;
	label: ReactNode;
	/** Second line inside the option (layout descriptions) */
	hint?: string;
	disabled?: boolean;
	/** Why it is disabled: a tooltip, and the radio's description */
	title?: string;
	className?: string;
};

/**
 * "Saving…" beside a setting's label. The hidden comma keeps the label and
 * the status apart in the group's accessible name ("Layout, Saving…")
 */
export function OptStatus({ children }: { children?: string }) {
	return children ? (
		<span className="opt-status">
			<span className="sr-only">, </span>
			{children}
		</span>
	) : null;
}

/**
 * A native radio group drawn as segments: arrow keys move the choice, the
 * legend names it. `cards` stacks each option's hint under its label
 */
export function SegRadio<T extends string | number>({
	legend,
	value,
	options,
	onChange,
	note,
	error,
	status,
	cards = false,
	className,
}: {
	legend: ReactNode;
	value: T;
	options: SegOption<T>[];
	onChange: (next: T) => void;
	/** One line under the group, e.g. what the chosen option does */
	note?: ReactNode;
	error?: string;
	/** Shown beside the legend, e.g. "Saving…" */
	status?: string;
	cards?: boolean;
	className?: string;
}) {
	const name = useId();
	const noteId = useId();
	return (
		<fieldset
			className={`opt${className ? ` ${className}` : ""}`}
			aria-describedby={note ? noteId : undefined}
			aria-busy={status ? true : undefined}
		>
			<legend className="opt-label">
				{legend}
				<OptStatus>{status}</OptStatus>
			</legend>
			<div className={`seg-radio${cards ? " seg-cards" : ""}`}>
				{options.map((o, i) => {
					const why = o.title ? `${name}-why-${i}` : undefined;
					return (
						<Fragment key={String(o.value)}>
							<label
								className={`seg-opt${o.className ? ` ${o.className}` : ""}`}
								title={o.title}
							>
								<input
									className="seg-input"
									type="radio"
									name={name}
									value={String(o.value)}
									checked={o.value === value}
									disabled={o.disabled}
									aria-describedby={why}
									onChange={() => onChange(o.value)}
								/>
								<span className="seg-name">{o.label}</span>
								{o.hint ? <span className="seg-hint">{o.hint}</span> : null}
							</label>
							{why ? (
								<span id={why} hidden>
									{o.title}
								</span>
							) : null}
						</Fragment>
					);
				})}
			</div>
			{note ? (
				<p className="opt-note" id={noteId}>
					{note}
				</p>
			) : null}
			{error ? (
				<p className="field-error opt-error" role="alert">
					{error}
				</p>
			) : null}
		</fieldset>
	);
}
