import { Fragment, type ReactNode } from "react";
import { parseRichText, type RichSegment } from "@/lib/richtext";

type Marks = Pick<RichSegment, "bold" | "italic" | "hl">;

export function marked(marks: Marks, node: ReactNode): ReactNode {
	let out = node;
	if (marks.hl) out = <span className="coll-hl">{out}</span>;
	if (marks.italic) out = <em>{out}</em>;
	if (marks.bold) out = <strong>{out}</strong>;
	return out;
}

export function RichText({ text }: { text: string }) {
	return parseRichText(text).map((segment) => (
		<Fragment key={segment.at}>{marked(segment, segment.text)}</Fragment>
	));
}
