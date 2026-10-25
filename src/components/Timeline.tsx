import type { Messages } from "@/i18n/messages";
import { type TimelineTab, timelineHref } from "@/lib/files-view";
import type {
	TermKind,
	ViewChapterSpan,
	ViewEvent,
	ViewMap,
	ViewSection,
	ViewTerm,
	ViewTermGroup,
	ViewThread,
	ViewYear,
} from "@/lib/timeline";
import { fill } from "@/phi/lib/card-i18n";
import type { Crumb } from "./Breadcrumb";
import { CollectionToc } from "./CollectionToc";
import { DocHead } from "./DocHead";
import { FilesSwap } from "./FilesFrame";
import { FilesLink } from "./FilesLink";
import {
	type DetailsCopy,
	DetailsCopyProvider,
	TimelineDetails,
} from "./TimelineDetails";
import { RefLink } from "./TimelineRef";
import { TimelineStage } from "./TimelineStage";

type Copy = Messages["timeline"];

const ROW = 12;
const TOP = 18;
const LABEL_MIN = 2;
const DENSE = 400;
const ZOOM = 1;

export type TimelineData = {
	sections: ViewSection[];
	chapters: ViewChapterSpan[];
	threads: ViewThread[];
	map: ViewMap;
	terms: ViewTermGroup[];
};

function sectionTitle(section: ViewSection, t: Copy): string {
	if (section.kind === "before") return t.realBeforeTitle;
	if (section.kind === "after") return t.realAfterTitle;
	if (section.kind === "unplaced") return t.unplacedTitle;
	return section.title;
}

function sectionLede(section: ViewSection, t: Copy): string {
	if (section.kind === "before") return t.realBeforeLede;
	if (section.kind === "after") return t.realAfterLede;
	if (section.kind === "unplaced") return t.unplacedLede;
	return section.summary;
}

function sectionSpan(section: ViewSection): string {
	if (section.span) return section.span;
	if (section.kind !== "before" && section.kind !== "after") return "";
	const first = section.years[0]?.label ?? "";
	const last = section.years[section.years.length - 1]?.label ?? "";
	return first === last ? first : `${first} – ${last}`;
}

function artOf(section: ViewSection): string {
	const id =
		section.kind === "era"
			? section.id.replace(/^era-/, "")
			: section.kind === "before" || section.kind === "after"
				? section.kind
				: section.id;
	return `/timeline/eras/${id}.svg`;
}

function eventCount(section: ViewSection): number {
	return Math.max(0, section.to - section.from + 1);
}

function Banner({
	section,
	level,
	headingId,
	t,
}: {
	section: ViewSection;
	level: "h2" | "h3";
	headingId: string;
	t: Copy;
}) {
	const Heading = level;
	const span = sectionSpan(section);
	const lede = sectionLede(section, t);
	return (
		<div
			className="tl-banner"
			data-kind={section.kind}
			style={{ backgroundImage: `url(${artOf(section)})` }}
		>
			<div className="tl-banner-text">
				<Heading id={headingId}>{sectionTitle(section, t)}</Heading>
				{span ? (
					<p className="tl-span">
						{span}
						{section.real ? (
							<span className="tl-real">{section.real}</span>
						) : null}
					</p>
				) : null}
				{lede ? <p className="tl-lede">{lede}</p> : null}
			</div>
		</div>
	);
}

function EventCard({
	event,
	community,
	t,
}: {
	event: ViewEvent;
	community: boolean;
	t: Copy;
}) {
	const extra = event.terms.length + event.notes.length + event.refs.length;
	return (
		<article
			className="tl-card"
			id={event.anchor}
			data-i={event.index}
			data-when={event.full}
			data-source={event.source}
			aria-labelledby={`${event.anchor}-title`}
		>
			<p className="tl-meta">
				{event.when ? <span className="tl-when">{event.when}</span> : null}
				{event.tower ? <span className="tl-tower">{event.tower}</span> : null}
				<span className="tl-source">{t.sources[event.source]}</span>
				{event.inferred ? (
					<span className="tl-inferred">{t.inferred}</span>
				) : null}
			</p>
			<h4 className="tl-title" id={`${event.anchor}-title`}>
				<a href={`#${event.anchor}`} data-tl-title="">
					{event.title}
				</a>
			</h4>
			<p className="tl-summary">{event.summary}</p>
			{event.note ? <p className="tl-note">{event.note}</p> : null}
			{event.chapters.length || event.threads.length ? (
				<ul className="tl-tags">
					{event.chapters.map((c) => (
						<li key={`c-${c.id}`}>
							<a className="tl-tag tl-tag-chapter" href={c.href}>
								<span className="tl-tag-short">{c.short}</span>
								{c.name}
							</a>
						</li>
					))}
					{event.threads.map((th) => (
						<li key={`t-${th.id}`}>
							<a
								className="tl-tag"
								href={timelineHref({ thread: th.id, community })}
							>
								{th.name}
							</a>
						</li>
					))}
				</ul>
			) : null}
			{extra ? (
				<TimelineDetails
					part="event"
					id={event.id}
					community={community}
					className="tl-more"
					summary={
						<>
							{t.more}
							<span className="tl-more-count">
								{[
									event.terms.length
										? `${t.setting} ${event.terms.length}`
										: "",
									event.notes.length ? `${t.notes} ${event.notes.length}` : "",
									event.refs.length ? `${t.refs} ${event.refs.length}` : "",
								]
									.filter(Boolean)
									.join(" · ")}
							</span>
						</>
					}
				/>
			) : null}
		</article>
	);
}

function Archive({ year, t }: { year: ViewYear; t: Copy }) {
	return (
		<details className="tl-card tl-archive">
			<summary>
				{year.entries === 1
					? t.entriesOne
					: fill(t.entries, { n: year.entries })}
			</summary>
			<dl>
				{year.days.map((day) => (
					<div key={day.when} className="tl-day">
						<dt>{day.when}</dt>
						<dd>
							<ul>
								{day.entries.map((entry) => (
									<li key={entry.id}>
										<span className="tl-entry-chapter">{entry.chapter}</span>
										<a href={entry.href}>{entry.title}</a>
									</li>
								))}
							</ul>
						</dd>
					</div>
				))}
			</dl>
		</details>
	);
}

function Years({
	section,
	community,
	t,
}: {
	section: ViewSection;
	community: boolean;
	t: Copy;
}) {
	return (
		<ol className="tl-years">
			{section.years.flatMap((year) => [
				...(year.gap
					? [
							<li key={`${year.id}-gap`} className="tl-gap">
								<span>
									{year.gap === 1
										? t.yearLater
										: fill(t.yearsLater, { n: year.gap })}
								</span>
							</li>,
						]
					: []),
				<li key={year.id} className="tl-yr">
					<h3 className="tl-yr-head" id={year.id}>
						<span className="tl-yr-label">
							{year.label}
							{year.real ? <span className="tl-real">{year.real}</span> : null}
						</span>
					</h3>
					<ol className="tl-cards">
						{year.events.map((event) => (
							<li key={event.id}>
								<EventCard event={event} community={community} t={t} />
							</li>
						))}
						{year.days.length ? (
							<li>
								<Archive year={year} t={t} />
							</li>
						) : null}
					</ol>
				</li>,
			])}
		</ol>
	);
}

function StoryMap({
	map,
	sections,
	thread,
	community,
	t,
}: {
	map: ViewMap;
	sections: ViewSection[];
	thread: string | undefined;
	community: boolean;
	t: Copy;
}) {
	const n = map.count;
	const r = n > DENSE ? 3 : 4;
	const x = (i: number) => `${((i + 0.5) / n) * 100}%`;
	const y = (row: number) => TOP + row * ROW + ROW / 2;
	const height = TOP + map.rows.length * ROW + 4;
	return (
		<section className="tl-map" aria-labelledby="tl-map-title">
			<header className="tl-map-head">
				<div>
					<h2 id="tl-map-title">{t.mapTitle}</h2>
					<p>{t.mapLede}</p>
				</div>
				<div className="tl-zoom" data-tl-map-zoom-box="" hidden>
					<button type="button" data-tl-map-zoom="-1" aria-label={t.mapZoomOut}>
						<span aria-hidden="true">−</span>
					</button>
					<span className="tl-zoom-level">
						<span className="sr-only">{t.mapZoomLabel}: </span>
						<span data-tl-map-zoom-level="">1×</span>
					</span>
					<button type="button" data-tl-map-zoom="1" aria-label={t.mapZoomIn}>
						<span aria-hidden="true">+</span>
					</button>
				</div>
			</header>
			<div className="tl-map-body">
				<ol className="tl-map-labels" style={{ paddingTop: TOP }}>
					{map.rows.map((row) => (
						<li key={row.id || "other"} data-row={row.id}>
							{row.id ? (
								<FilesLink
									href={timelineHref({
										thread: row.id === thread ? undefined : row.id,
										community,
									})}
									data-active={row.id === thread ? "" : undefined}
								>
									{row.name}
								</FilesLink>
							) : (
								<span>{row.name}</span>
							)}
						</li>
					))}
				</ol>
				<div className="tl-map-scroll" data-tl-map-scroll="">
					<div
						className="tl-map-plot"
						data-tl-map=""
						data-top={TOP}
						data-row-h={ROW}
					>
						<svg
							width="100%"
							height={height}
							role="img"
							aria-label={fill(t.mapLabel, { n, rows: map.rows.length })}
						>
							{sections.map((s, at) => {
								const from = (s.from / n) * 100;
								const width = ((s.to - s.from + 1) / n) * 100;
								return (
									<g key={s.id} className="tl-band" data-kind={s.kind}>
										<rect
											x={`${from}%`}
											width={`${width}%`}
											y={0}
											height={height}
											data-alt={at % 2 ? "" : undefined}
										/>
										{width >= LABEL_MIN ? (
											<text x={`${from}%`} dx={4} y={11}>
												{s.short}
											</text>
										) : null}
									</g>
								);
							})}
							{map.links.map((link) => (
								<line
									key={`l-${link.i}`}
									className="tl-link"
									x1={x(link.i)}
									x2={x(link.i)}
									y1={y(link.from)}
									y2={y(link.to)}
								/>
							))}
							{map.rows.map((row, at) => (
								<g key={row.id || "other"} className="tl-row" data-row={row.id}>
									<line
										className="tl-row-line"
										x1={x(row.first)}
										x2={x(row.last)}
										y1={y(at)}
										y2={y(at)}
									/>
									{row.dots.map((dot) => (
										<circle
											key={dot.i}
											className="tl-dot"
											data-s={dot.source}
											cx={x(dot.i)}
											cy={y(at)}
											r={r}
										/>
									))}
								</g>
							))}
						</svg>
						<div className="tl-map-view" data-tl-view="" hidden />
						<div className="tl-map-mark" data-tl-mark="" hidden />
						<div className="tl-map-hair" data-tl-hair="" hidden />
					</div>
				</div>
				<div className="tl-map-tip" data-tl-tip="" hidden>
					<strong data-tl-tip-title="" />
					<span data-tl-tip-when="" />
				</div>
			</div>
			<ul className="tl-legend">
				{(["game", "official", "community"] as const).map((s) => (
					<li key={s} data-s={s}>
						{t.sources[s]}
					</li>
				))}
			</ul>
		</section>
	);
}

function ThreadChips({
	threads,
	thread,
	community,
	t,
}: {
	threads: ViewThread[];
	thread: string | undefined;
	community: boolean;
	t: Copy;
}) {
	return (
		<nav className="tl-threads" aria-label={t.threadsLabel}>
			<ul className="tl-chips">
				<li>
					<FilesLink
						className="tl-chip"
						href={timelineHref({ community })}
						aria-current={thread ? undefined : "page"}
					>
						{t.allThreads}
					</FilesLink>
				</li>
				{threads.map((th) => (
					<li key={th.id}>
						<FilesLink
							className="tl-chip"
							href={timelineHref({ thread: th.id, community })}
							aria-current={th.id === thread ? "page" : undefined}
						>
							{th.name}
							<span className="tl-chip-count">{th.count}</span>
						</FilesLink>
					</li>
				))}
			</ul>
		</nav>
	);
}

function TrackTab({
	data,
	thread,
	community,
	t,
}: {
	data: TimelineData;
	thread: string | undefined;
	community: boolean;
	t: Copy;
}) {
	const { sections, threads, map } = data;
	const picked = threads.find((th) => th.id === thread);
	return (
		<>
			<ThreadChips
				threads={threads}
				thread={thread}
				community={community}
				t={t}
			/>
			{picked ? (
				<div className="callout tl-filtered" role="status">
					{picked.summary ? (
						<p>
							<strong>{picked.name}</strong> {picked.summary}
						</p>
					) : null}
					<p>
						{t.filtered}{" "}
						<a
							href={timelineHref(
								{ tab: "threads", community },
								`thread-${picked.id}`,
							)}
						>
							{t.wikiPages}
						</a>
					</p>
				</div>
			) : null}
			{sections.length ? (
				<TimelineStage
					key={`${thread ?? ""}:${community}`}
					sources={t.sources}
					zoomLevels={t.zoomLevels}
					zoom={ZOOM}
				>
					<StoryMap
						map={map}
						sections={sections}
						thread={thread}
						community={community}
						t={t}
					/>
					<nav className="tl-jump" aria-label={t.eras}>
						<ul className="tl-jump-list">
							{sections.map((s) => (
								<li key={s.id}>
									<a href={`#${s.id}`} data-kind={s.kind}>
										{s.short}
									</a>
								</li>
							))}
						</ul>
						<div className="tl-tools">
							<div className="tl-zoom" data-tl-zoom-box="" hidden>
								<button type="button" data-tl-zoom="-1" aria-label={t.zoomOut}>
									<span aria-hidden="true">−</span>
								</button>
								<span className="tl-zoom-level">
									<span className="sr-only">{t.zoomLabel}: </span>
									<span data-tl-zoom-level="">{t.zoomLevels[ZOOM]}</span>
								</span>
								<button type="button" data-tl-zoom="1" aria-label={t.zoomIn}>
									<span aria-hidden="true">+</span>
								</button>
							</div>
							<div className="tl-steps">
								<button type="button" data-tl-step="-1" aria-label={t.prev}>
									<span aria-hidden="true">←</span>
								</button>
								<button type="button" data-tl-step="1" aria-label={t.next}>
									<span aria-hidden="true">→</span>
								</button>
							</div>
						</div>
					</nav>
					<div className="tl-track-wrap">
						<section
							className="tl-track"
							data-tl-track=""
							aria-label={t.trackLabel}
							aria-describedby="tl-hint"
							// biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll area must be focusable to pan with the keyboard
							tabIndex={0}
						>
							<div className="tl-rail">
								{sections.map((section) => (
									<section
										key={section.id}
										id={section.id}
										className="tl-seg"
										data-kind={section.kind}
										aria-labelledby={`${section.id}-title`}
									>
										<header className="tl-seg-head">
											<Banner
												section={section}
												level="h2"
												headingId={`${section.id}-title`}
												t={t}
											/>
										</header>
										<Years section={section} community={community} t={t} />
									</section>
								))}
							</div>
						</section>
					</div>
					<p className="tl-hint" id="tl-hint">
						{t.mapHint}
					</p>
				</TimelineStage>
			) : (
				<p className="asset-note">{t.noEvents}</p>
			)}
		</>
	);
}

function ErasTab({
	sections,
	community,
	t,
}: {
	sections: ViewSection[];
	community: boolean;
	t: Copy;
}) {
	return (
		<>
			<p className="tl-tab-lede">{t.erasLede}</p>
			<details className="tl-about" open>
				<summary>{t.calendarTitle}</summary>
				{t.calendar.map((line) => (
					<p key={line}>{line}</p>
				))}
			</details>
			<ol className="tl-era-list">
				{sections.map((s) => {
					const n = eventCount(s);
					return (
						<li key={s.id}>
							<section className="tl-era" aria-labelledby={`era-card-${s.id}`}>
								<Banner
									section={s}
									level="h2"
									headingId={`era-card-${s.id}`}
									t={t}
								/>
								<p className="tl-era-links">
									<span className="tl-era-count">
										{n === 1 ? t.eraEventsOne : fill(t.eraEvents, { n })}
									</span>
									<a href={timelineHref({ community }, s.id)}>{t.eraOpen}</a>
								</p>
							</section>
						</li>
					);
				})}
			</ol>
		</>
	);
}

function ThreadsTab({
	threads,
	community,
	t,
}: {
	threads: ViewThread[];
	community: boolean;
	t: Copy;
}) {
	return (
		<>
			<p className="tl-tab-lede">{t.threadsLede}</p>
			{threads.map((th) => {
				return (
					<section
						key={th.id}
						className="tl-thread"
						aria-labelledby={`thread-${th.id}`}
					>
						<h2 id={`thread-${th.id}`}>
							<a href={`#thread-${th.id}`}>{th.name}</a>
							<span className="tl-chip-count">
								{th.count === 1
									? t.eraEventsOne
									: fill(t.eraEvents, { n: th.count })}
							</span>
						</h2>
						{th.summary ? (
							<p className="tl-thread-summary">{th.summary}</p>
						) : null}
						<p className="tl-era-links">
							<FilesLink href={timelineHref({ thread: th.id, community })}>
								{t.threadOpen}
							</FilesLink>
						</p>
						{th.wiki.length ? (
							<div className="tl-thread-wiki">
								<h3>{t.wikiPages}</h3>
								<ul className="tl-term-refs">
									{th.wiki.map((ref) => (
										<li key={ref.href}>
											<RefLink refView={ref} t={t} />
										</li>
									))}
								</ul>
							</div>
						) : null}
						{th.count ? (
							<TimelineDetails
								part="thread-events"
								id={th.id}
								community={community}
								className="tl-term-events"
								summary={t.threadEvents}
							/>
						) : null}
					</section>
				);
			})}
		</>
	);
}

function ChaptersTab({
	chapters,
	community,
	t,
}: {
	chapters: ViewChapterSpan[];
	community: boolean;
	t: Copy;
}) {
	return (
		<>
			<p className="tl-tab-lede">{t.chaptersLede}</p>
			{chapters.map((c) => (
				<section
					key={c.id}
					className="tl-chapter"
					aria-labelledby={`chapter-${c.id}`}
				>
					<h2 id={`chapter-${c.id}`}>
						<span className="tl-tag-short">{c.short}</span>
						<span className="tl-chapter-name">{c.name}</span>
					</h2>
					{c.span ? <p className="tl-span">{c.span}</p> : null}
					<p className="tl-thread-summary">{c.synopsis}</p>
					<p className="tl-era-links">
						{c.first ? (
							<a href={timelineHref({ community }, c.first)}>{t.jump}</a>
						) : null}
						<a href={c.href}>{t.openChapter}</a>
					</p>
				</section>
			))}
		</>
	);
}

function TermCard({
	term,
	community,
	t,
}: {
	term: ViewTerm;
	community: boolean;
	t: Copy;
}) {
	return (
		<article
			className="tl-term"
			id={term.anchor}
			data-source={term.source}
			aria-labelledby={`${term.anchor}-name`}
		>
			<h3 id={`${term.anchor}-name`}>
				<a href={`#${term.anchor}`}>{term.name}</a>
				{term.alt ? <span className="tl-term-alt">{term.alt}</span> : null}
			</h3>
			<p className="tl-meta">
				<span className="tl-source">{t.sources[term.source]}</span>
				{term.threads.map((th) => (
					<a
						key={th.id}
						className="tl-tag"
						href={timelineHref({ thread: th.id, community })}
					>
						{th.name}
					</a>
				))}
			</p>
			<p className="tl-summary">{term.summary}</p>
			{term.events.length ? (
				<TimelineDetails
					part="term-events"
					id={term.id}
					community={community}
					className="tl-term-events"
					summary={
						term.events.length === 1
							? t.inTimelineOne
							: fill(t.inTimeline, { n: term.events.length })
					}
				/>
			) : (
				<p className="tl-term-none">{t.notInTimeline}</p>
			)}
			{term.refs.length ? (
				<TimelineDetails
					part="term-refs"
					id={term.id}
					community={community}
					className="tl-term-sources"
					summary={
						term.refs.length === 1
							? t.refsOne
							: fill(t.refsCount, { n: term.refs.length })
					}
				/>
			) : null}
		</article>
	);
}

function pageTerms(group: ViewTermGroup, page: number) {
	const shown = group.terms.filter((term) => term.page === page);
	return (["official", "community"] as const).flatMap((source) => {
		const terms = shown.filter((term) => term.source === source);
		return terms.length ? [{ source, terms }] : [];
	});
}

function Pager({
	group,
	page,
	community,
	label,
}: {
	group: ViewTermGroup;
	page: number;
	community: boolean;
	label: string;
}) {
	const pages = (group.terms[group.terms.length - 1]?.page ?? 0) + 1;
	if (pages < 2) return null;
	return (
		<nav className="tl-pager" aria-label={label}>
			<ul>
				{Array.from({ length: pages }, (_, n) => n).map((at) => (
					<li key={at}>
						<FilesLink
							href={timelineHref({
								tab: "setting",
								community,
								kind: group.kind,
								page: at,
							})}
							aria-current={at === page ? "page" : undefined}
						>
							{at + 1}
						</FilesLink>
					</li>
				))}
			</ul>
		</nav>
	);
}

function SettingTab({
	groups,
	kind,
	page,
	community,
	t,
}: {
	groups: ViewTermGroup[];
	kind: TermKind | undefined;
	page: number;
	community: boolean;
	t: Copy;
}) {
	const group = kind ? groups.find((g) => g.kind === kind) : undefined;
	const parts = group ? pageTerms(group, page) : [];
	return (
		<>
			<p className="tl-tab-lede">{t.settingLede}</p>
			<nav className="tl-kinds" aria-label={t.settingTitle}>
				<ul className="tl-chips">
					<li>
						<FilesLink
							className="tl-chip"
							href={timelineHref({ tab: "setting", community })}
							aria-current={kind ? undefined : "page"}
						>
							{t.settingAll}
						</FilesLink>
					</li>
					{groups.map((g) => (
						<li key={g.kind}>
							<FilesLink
								className="tl-chip"
								href={timelineHref({ tab: "setting", community, kind: g.kind })}
								aria-current={g.kind === kind ? "page" : undefined}
							>
								{t.kinds[g.kind]}
								<span className="tl-chip-count">{g.terms.length}</span>
							</FilesLink>
						</li>
					))}
				</ul>
			</nav>
			{group ? (
				<Pager
					group={group}
					page={page}
					community={community}
					label={t.pages}
				/>
			) : null}
			{group
				? parts.map((part) => (
						<section
							key={part.source}
							className="tl-kind"
							aria-labelledby={`tl-terms-${part.source}`}
						>
							<h2 id={`tl-terms-${part.source}`}>
								<a href={`#tl-terms-${part.source}`}>
									{t.kinds[group.kind]} · {t.sources[part.source]}
								</a>
								<span className="tl-chip-count">
									{fill(t.settingCount, { n: part.terms.length })}
								</span>
							</h2>
							<div className="tl-terms">
								{part.terms.map((term) => (
									<TermCard
										key={term.id}
										term={term}
										community={community}
										t={t}
									/>
								))}
							</div>
						</section>
					))
				: groups.map((g) => {
						const official = g.terms.filter(
							(term) => term.source === "official",
						);
						return official.length ? (
							<section
								key={g.kind}
								className="tl-kind"
								aria-labelledby={`tl-kind-${g.kind}`}
							>
								<h2 id={`tl-kind-${g.kind}`}>
									<a href={`#tl-kind-${g.kind}`}>{t.kinds[g.kind]}</a>
									<span className="tl-chip-count">
										{fill(t.settingCount, { n: official.length })}
									</span>
								</h2>
								<div className="tl-terms">
									{official.map((term) => (
										<TermCard
											key={term.id}
											term={term}
											community={community}
											t={t}
										/>
									))}
								</div>
							</section>
						) : null;
					})}
			{group ? (
				<Pager
					group={group}
					page={page}
					community={community}
					label={t.pagesEnd}
				/>
			) : null}
			{!group && community ? (
				<p className="callout tl-filtered">{t.settingPerKind}</p>
			) : null}
		</>
	);
}

export function timelineToc(
	tab: TimelineTab,
	data: TimelineData,
	t: Copy,
	kind?: TermKind,
	page = 0,
): { id: string; title: string }[] {
	switch (tab) {
		case "eras":
			return data.sections.map((s) => ({
				id: `era-card-${s.id}`,
				title: sectionTitle(s, t),
			}));
		case "threads":
			return data.threads.map((th) => ({
				id: `thread-${th.id}`,
				title: th.name,
			}));
		case "chapters":
			return data.chapters.map((c) => ({
				id: `chapter-${c.id}`,
				title: `${c.short} ${c.name}`,
			}));
		case "setting": {
			const group = kind ? data.terms.find((g) => g.kind === kind) : undefined;
			if (group) {
				return pageTerms(group, page).map(({ source }) => ({
					id: `tl-terms-${source}`,
					title: `${t.kinds[group.kind]} · ${t.sources[source]}`,
				}));
			}
			return data.terms
				.filter((g) => g.terms.some((term) => term.source === "official"))
				.map((g) => ({ id: `tl-kind-${g.kind}`, title: t.kinds[g.kind] }));
		}
		default:
			return [];
	}
}

export function Timeline({
	tab,
	kind,
	page = 0,
	data,
	thread,
	community,
	crumbs,
	crumbLabel,
	tocLabel,
	t,
}: {
	tab: TimelineTab;
	kind?: TermKind;
	page?: number;
	data: TimelineData;
	thread: string | undefined;
	community: boolean;
	crumbs: Crumb[];
	crumbLabel: string;
	tocLabel: string;
	t: Copy;
}) {
	const tabs: TimelineTab[] = [
		"timeline",
		"eras",
		"threads",
		"chapters",
		"setting",
	];
	const detailsCopy: DetailsCopy = {
		newTab: t.newTab,
		sources: t.sources,
		setting: t.setting,
		notes: t.notes,
		refs: t.refs,
		effects: t.effects,
		interview: t.interview,
		detailsLoading: t.detailsLoading,
		detailsFailed: t.detailsFailed,
		retry: t.retry,
	};
	return (
		<DetailsCopyProvider copy={detailsCopy}>
			<article className="doc tl" data-tab={tab} aria-labelledby="doc-title">
				<DocHead crumbs={crumbs} crumbLabel={crumbLabel} title={t.title}>
					{t.lede}
				</DocHead>
				<div className="tl-bar">
					<nav className="tl-tabs" aria-label={t.tabsLabel}>
						<ul>
							{tabs.map((id) => (
								<li key={id}>
									<FilesLink
										href={timelineHref({
											tab: id,
											community,
											thread: id === "timeline" ? thread : undefined,
										})}
										aria-current={id === tab ? "page" : undefined}
									>
										{t.tabs[id]}
									</FilesLink>
								</li>
							))}
						</ul>
					</nav>
					<FilesLink
						className="tl-toggle"
						href={timelineHref({
							tab,
							thread: tab === "timeline" ? thread : undefined,
							kind: tab === "setting" ? kind : undefined,
							community: !community,
						})}
					>
						{community ? t.hideCommunity : t.showCommunity}
					</FilesLink>
				</div>
				<FilesSwap>
					{tab === "timeline" ? (
						<TrackTab data={data} thread={thread} community={community} t={t} />
					) : (
						<>
							<CollectionToc label={tocLabel} variant="popover" />
							{tab === "eras" ? (
								<ErasTab sections={data.sections} community={community} t={t} />
							) : null}
							{tab === "threads" ? (
								<ThreadsTab
									threads={data.threads}
									community={community}
									t={t}
								/>
							) : null}
							{tab === "chapters" ? (
								<ChaptersTab
									chapters={data.chapters}
									community={community}
									t={t}
								/>
							) : null}
							{tab === "setting" ? (
								<SettingTab
									groups={data.terms}
									kind={kind}
									page={page}
									community={community}
									t={t}
								/>
							) : null}
						</>
					)}
				</FilesSwap>
			</article>
		</DetailsCopyProvider>
	);
}
