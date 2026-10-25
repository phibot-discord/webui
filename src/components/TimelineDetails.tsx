"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Messages } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { timelineHref } from "@/lib/files-view";
import type { EventDetails, TermDetails, ThreadDetails } from "@/lib/timeline";
import { loadTimelineDetails } from "@/timeline-actions";
import { type RefCopy, RefLink } from "./TimelineRef";

export type DetailsCopy = RefCopy &
	Pick<
		Messages["timeline"],
		| "setting"
		| "notes"
		| "refs"
		| "effects"
		| "interview"
		| "detailsLoading"
		| "detailsFailed"
		| "retry"
	>;

type Details = EventDetails | TermDetails | ThreadDetails;

type Part = "event" | "term-events" | "term-refs" | "thread-events";

const CopyContext = createContext<DetailsCopy | undefined>(undefined);

const loaded = new Map<string, Details>();
const loading = new Map<string, Promise<Details>>();

function fetchDetails(
	key: string,
	ask: () => Promise<Details | undefined>,
): Promise<Details> {
	const hit = loaded.get(key);
	if (hit) return Promise.resolve(hit);
	let job = loading.get(key);
	if (!job) {
		job = ask()
			.then((data) => {
				if (!data) throw new Error("details missing");
				loaded.set(key, data);
				return data;
			})
			.finally(() => loading.delete(key));
		loading.set(key, job);
	}
	return job;
}

export function DetailsCopyProvider({
	copy,
	children,
}: {
	copy: DetailsCopy;
	children: ReactNode;
}) {
	return <CopyContext.Provider value={copy}>{children}</CopyContext.Provider>;
}

function EventMore({
	data,
	community,
	t,
}: {
	data: EventDetails;
	community: boolean;
	t: DetailsCopy;
}) {
	return (
		<>
			{data.terms.length ? (
				<div className="tl-more-part">
					<h5>{t.setting}</h5>
					<ul className="tl-term-chips">
						{data.terms.map((term) => (
							<li key={term.id}>
								<a
									className="tl-tag"
									href={timelineHref(
										{
											tab: "setting",
											community,
											kind: term.kind,
											page: term.page,
										},
										term.anchor,
									)}
								>
									{term.name}
								</a>
							</li>
						))}
					</ul>
				</div>
			) : null}
			{data.notes.length ? (
				<div className="tl-more-part">
					<h5>{t.notes}</h5>
					<ul className="tl-notes">
						{data.notes.map((note) => (
							<li
								key={`${note.effect}-${note.text}`}
								data-effect={note.effect}
								data-source={note.source}
							>
								<span className="tl-effect">{t.effects[note.effect]}</span>
								{note.source === "interview" ? (
									<span className="tl-note-source">{t.interview}</span>
								) : null}
								{note.text}
								{note.ref ? (
									<>
										{" "}
										<RefLink refView={note.ref} t={t} />
									</>
								) : null}
							</li>
						))}
					</ul>
				</div>
			) : null}
			{data.refs.length ? (
				<div className="tl-more-part">
					<h5>{t.refs}</h5>
					<ul className="tl-refs">
						{data.refs.map((ref) => (
							<li
								key={`${ref.kind}-${ref.href}-${ref.label}`}
								data-kind={ref.kind}
							>
								<RefLink refView={ref} t={t} />
							</li>
						))}
					</ul>
				</div>
			) : null}
		</>
	);
}

function Body({
	part,
	data,
	community,
	t,
}: {
	part: Part;
	data: Details;
	community: boolean;
	t: DetailsCopy;
}) {
	if (part === "event") {
		return (
			<EventMore data={data as EventDetails} community={community} t={t} />
		);
	}
	if (part === "term-refs") {
		return (
			<ul className="tl-term-refs">
				{(data as TermDetails).refs.map((ref) => (
					<li key={ref.href}>
						<RefLink refView={ref} t={t} />
					</li>
				))}
			</ul>
		);
	}
	return (
		<ol>
			{(data as ThreadDetails).events.map((e) => (
				<li key={e.anchor}>
					<a href={timelineHref({ community }, e.anchor)}>
						{e.when ? <span className="tl-when">{e.when}</span> : null}
						{e.title}
					</a>
				</li>
			))}
		</ol>
	);
}

export function TimelineDetails({
	part,
	id,
	community,
	className,
	summary,
}: {
	part: Part;
	id: string;
	community: boolean;
	className: string;
	summary: ReactNode;
}) {
	const t = useContext(CopyContext);
	const { locale } = useI18n();
	const kind =
		part === "event" ? "event" : part === "thread-events" ? "thread" : "term";
	const key = `${locale}|${community}|${kind}|${id}`;
	const ask = () => loadTimelineDetails(locale, community, kind, id);
	const box = useRef<HTMLDetailsElement>(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (box.current?.open) setOpen(true);
	}, []);
	const [got, setGot] = useState<{ key: string; failed: boolean }>();
	const data = loaded.get(key);
	const failed = got?.key === key && got.failed;

	useEffect(() => {
		if (!open || loaded.has(key)) return;
		let live = true;
		fetchDetails(key, () =>
			loadTimelineDetails(locale, community, kind, id),
		).then(
			() => {
				if (live) setGot({ key, failed: false });
			},
			() => {
				if (live) setGot({ key, failed: true });
			},
		);
		return () => {
			live = false;
		};
	}, [open, key, locale, community, kind, id]);

	const load = () => {
		setGot(undefined);
		fetchDetails(key, ask).then(
			() => setGot({ key, failed: false }),
			() => setGot({ key, failed: true }),
		);
	};
	const warm = () => {
		fetchDetails(key, ask).catch(() => {});
	};
	return (
		<details
			ref={box}
			className={className}
			onToggle={(e) => setOpen(e.currentTarget.open)}
		>
			<summary onPointerDown={warm}>{summary}</summary>
			{open && t ? (
				data ? (
					<Body part={part} data={data} community={community} t={t} />
				) : failed ? (
					<p className="tl-details-note">
						{t.detailsFailed}{" "}
						<button
							type="button"
							className="btn btn-ghost btn-sm"
							onClick={load}
						>
							{t.retry}
						</button>
					</p>
				) : (
					<p className="tl-details-note" role="status">
						{t.detailsLoading}
					</p>
				)
			) : null}
		</details>
	);
}
