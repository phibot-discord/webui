export type NoteKinds = {
	tap: number;
	drag: number;
	hold: number;
	flick: number;
};

export type ChartStats = {
	notes: number;
	kinds: NoteKinds;
	lines: number;
	bpms: number[];
	duration: number;
	peak: number;
	density: number[];
};

const KIND_OF: Record<number, keyof NoteKinds> = {
	1: "tap",
	2: "drag",
	3: "hold",
	4: "flick",
};

type RawNote = { type?: unknown; time?: unknown; holdTime?: unknown };
type RawLine = { bpm?: unknown; notesAbove?: unknown; notesBelow?: unknown };

const notesOf = (v: unknown): RawNote[] =>
	Array.isArray(v) ? (v as RawNote[]) : [];

export function chartStats(raw: unknown): ChartStats | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const list = (raw as { judgeLineList?: unknown }).judgeLineList;
	if (!Array.isArray(list)) return undefined;
	const kinds: NoteKinds = { tap: 0, drag: 0, hold: 0, flick: 0 };
	const bpms = new Set<number>();
	const times: number[] = [];
	let duration = 0;
	for (const line of list as RawLine[]) {
		const bpm = Number(line?.bpm);
		if (!(bpm > 0)) continue;
		bpms.add(Math.round(bpm * 1000) / 1000);
		const unit = 1.875 / bpm;
		for (const note of [
			...notesOf(line.notesAbove),
			...notesOf(line.notesBelow),
		]) {
			const kind = KIND_OF[Number(note?.type)];
			const time = Number(note?.time);
			if (!kind || !Number.isFinite(time)) continue;
			kinds[kind]++;
			const at = time * unit;
			times.push(at);
			const end = at + Math.max(0, Number(note.holdTime) || 0) * unit;
			if (end > duration) duration = end;
		}
	}
	if (!times.length) return undefined;
	times.sort((a, b) => a - b);
	const bins = Math.max(1, Math.ceil(duration));
	const density = new Array<number>(bins).fill(0);
	for (const t of times) {
		const bin = Math.min(bins - 1, Math.max(0, Math.floor(t)));
		density[bin] = (density[bin] ?? 0) + 1;
	}
	let peak = 0;
	let j = 0;
	times.forEach((t, i) => {
		while ((times[j] ?? t) <= t - 1) j++;
		peak = Math.max(peak, i - j + 1);
	});
	return {
		notes: times.length,
		kinds,
		lines: list.length,
		bpms: [...bpms].sort((a, b) => a - b),
		duration: Math.round(duration * 100) / 100,
		peak,
		density,
	};
}

export type StatsDiff = {
	notes: number;
	kinds: NoteKinds;
	duration: number;
	lines: number;
	density: number[];
	changedSeconds: number;
};

export function diffStats(from: ChartStats, to: ChartStats): StatsDiff {
	const len = Math.max(from.density.length, to.density.length);
	const density: number[] = [];
	let changedSeconds = 0;
	for (let i = 0; i < len; i++) {
		const d = (to.density[i] ?? 0) - (from.density[i] ?? 0);
		density.push(d);
		if (d) changedSeconds++;
	}
	return {
		notes: to.notes - from.notes,
		kinds: {
			tap: to.kinds.tap - from.kinds.tap,
			drag: to.kinds.drag - from.kinds.drag,
			hold: to.kinds.hold - from.kinds.hold,
			flick: to.kinds.flick - from.kinds.flick,
		},
		duration: Math.round((to.duration - from.duration) * 100) / 100,
		lines: to.lines - from.lines,
		density,
		changedSeconds,
	};
}

export function formatDuration(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
