export type RichSegment = {
	at: number;
	text: string;
	bold: boolean;
	italic: boolean;
	hl: boolean;
};

type TagKind = "b" | "i" | "color" | "size";

type Tag = { kind: TagKind; close: boolean; at: number; end: number };

const TAG = /<(\/?)(b|i|color|size)(=[^<>]+)?>/g;

function tagsOf(source: string): Tag[] {
	const tags: Tag[] = [];
	for (const m of source.matchAll(TAG)) {
		const close = m[1] === "/";
		const kind = m[2] as TagKind;
		const valued = m[3] !== undefined;
		const plain = close || kind === "b" || kind === "i";
		if (valued === plain) continue;
		tags.push({ kind, close, at: m.index, end: m.index + m[0].length });
	}
	return tags;
}

export function parseRichText(source: string): RichSegment[] {
	const tags = tagsOf(source);
	const paired = new Set<Tag>();
	const open: Record<TagKind, Tag[]> = { b: [], i: [], color: [], size: [] };
	for (const tag of tags) {
		if (!tag.close) {
			open[tag.kind].push(tag);
			continue;
		}
		const from = open[tag.kind].pop();
		if (!from) continue;
		paired.add(from);
		paired.add(tag);
	}
	const depth: Record<TagKind, number> = { b: 0, i: 0, color: 0, size: 0 };
	const out: RichSegment[] = [];
	const push = (at: number, text: string) => {
		if (!text) return;
		const bold = depth.b > 0;
		const italic = depth.i > 0;
		const hl = depth.color > 0;
		const last = out.at(-1);
		if (last?.bold === bold && last.italic === italic && last.hl === hl) {
			last.text += text;
			return;
		}
		out.push({ at, text, bold, italic, hl });
	};
	let pos = 0;
	for (const tag of tags) {
		if (!paired.has(tag)) continue;
		push(pos, source.slice(pos, tag.at));
		depth[tag.kind] += tag.close ? -1 : 1;
		pos = tag.end;
	}
	push(pos, source.slice(pos));
	return out;
}
