"use client";

import { Fragment, type ReactNode, useId } from "react";

export type SegOption<T extends string | number> = {
	value: T;
	label: ReactNode;
	hint?: string;
	disabled?: boolean;
	title?: string;
	className?: string;
};

export function OptStatus({ children }: { children?: string }) {
	return children ? (
		<span className="opt-status">
			<span className="sr-only">, </span>
			{children}
		</span>
	) : null;
}

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
	note?: ReactNode;
	error?: string;
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
