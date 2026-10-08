import type { ReactNode } from "react";

function words(text: string): ReactNode[] {
	let at = 0;
	return text.split("*").map((part, i) => {
		const key = at;
		at += part.length + 1;
		return i % 2 ? (
			<span key={key} className="brand-word">
				{part}
			</span>
		) : (
			part
		);
	});
}

export function Rich({ text }: { text: string }) {
	const lines = text.split("\n");
	if (lines.length === 1) return <>{words(text)}</>;
	let at = 0;
	return (
		<>
			{lines.map((line) => {
				const key = at;
				at += line.length + 1;
				return (
					<span key={key} className="line">
						{words(line)}
					</span>
				);
			})}
		</>
	);
}
