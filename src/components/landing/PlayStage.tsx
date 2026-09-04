type NoteKind = "tap" | "drag" | "hold";

const NOTES: { lane: number; kind: NoteKind; d: number; rest: string }[] = [
	{ lane: 0, kind: "tap", d: 0, rest: "18%" },
	{ lane: 2, kind: "drag", d: 0.55, rest: "62%" },
	{ lane: 1, kind: "tap", d: 1.1, rest: "40%" },
	{ lane: 3, kind: "hold", d: 1.6, rest: "70%" },
	{ lane: 4, kind: "tap", d: 2.2, rest: "28%" },
	{ lane: 1, kind: "drag", d: 2.75, rest: "84%" },
	{ lane: 3, kind: "tap", d: 3.3, rest: "8%" },
	{ lane: 0, kind: "hold", d: 3.9, rest: "52%" },
	{ lane: 2, kind: "tap", d: 4.4, rest: "34%" },
];

export function PlayStage() {
	return (
		<div className="stage" aria-hidden="true">
			<div className="stage-lane">
				<div className="stage-notes">
					{NOTES.map((n, i) => (
						<span
							key={`${n.lane}-${n.d}`}
							className={`note is-${n.kind}`}
							style={{
								["--lane" as string]: n.lane,
								["--d" as string]: n.d,
								["--rest" as string]: n.rest,
								["--i" as string]: i,
							}}
						/>
					))}
				</div>
				<div className="stage-judge" />
			</div>
		</div>
	);
}
