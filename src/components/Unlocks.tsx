"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTocHide } from "@/components/CollectionToc";
import { Check } from "@/components/icons";
import Link from "@/components/LocaleLink";
import { useHeaderSession } from "@/components/useHeaderSession";
import type { Messages } from "@/i18n/messages";
import { itemAnchor } from "@/lib/collection";
import { readLocal, writeLocal } from "@/lib/local-store";
import {
	itemUnlock,
	parseUnlocksReply,
	type UnlockItem,
	type UnlocksShown,
	type UnlockTally,
} from "@/lib/unlocks";
import { fill } from "@/phi/lib/card-i18n";

type Copy = Messages["unlocks"];

type Why = "manual" | "refresh" | "unreadable";

type View =
	| { kind: "idle" }
	| { kind: "missing"; why: Why }
	| { kind: "ok"; reply: UnlocksShown; avatars: ReadonlySet<string> };

const IDLE: View = { kind: "idle" };
const LOCKED_KEY = "phi-unlocks-locked";
const MISSING_KEY = "phi-unlocks-missing";

const UnlocksContext = createContext<{ view: View; want: () => void }>({
	view: IDLE,
	want: () => {},
});

async function fetchUnlocks(): Promise<View> {
	try {
		const res = await fetch("/api/me/unlocks", { cache: "no-store" });
		if (!res.ok) return IDLE;
		const reply = parseUnlocksReply(await res.json());
		if (!reply || reply.state === "none") return IDLE;
		if (reply.state === "ok")
			return { kind: "ok", reply, avatars: new Set(reply.avatars) };
		return { kind: "missing", why: reply.state };
	} catch {
		return IDLE;
	}
}

export function UnlocksProvider({ children }: { children: ReactNode }) {
	const { signedIn } = useHeaderSession();
	const [wanted, setWanted] = useState(false);
	const [view, setView] = useState<View>(IDLE);
	const started = useRef(false);

	useEffect(() => {
		if (!signedIn || !wanted || started.current) return;
		started.current = true;
		void fetchUnlocks().then(setView);
	}, [signedIn, wanted]);

	const want = useCallback(() => setWanted(true), []);
	const value = useMemo(
		() => ({ view: signedIn ? view : IDLE, want }),
		[signedIn, view, want],
	);
	return (
		<UnlocksContext.Provider value={value}>{children}</UnlocksContext.Provider>
	);
}

function useWantedView(): View {
	const { view, want } = useContext(UnlocksContext);
	useEffect(() => want(), [want]);
	return view;
}

function useStoredSwitch(key: string): [boolean, (on: boolean) => void] {
	const [on, setOn] = useState(false);
	useEffect(() => {
		setOn(readLocal(key) === "1");
	}, [key]);
	const set = useCallback(
		(next: boolean) => {
			setOn(next);
			writeLocal(key, next ? "1" : "0");
		},
		[key],
	);
	return [on, set];
}

export function useChapterUnlocks():
	| Readonly<Record<string, UnlockTally>>
	| undefined {
	const { view } = useContext(UnlocksContext);
	return view.kind === "ok" ? view.reply.chapters : undefined;
}

function MissingNote({ why, t }: { why: Why; t: Copy }) {
	return (
		<div className="unlock-head">
			<p className="field-hint">
				{why === "refresh" ? (
					<>
						{t.refresh}{" "}
						<Link href="/me/b30" prefetch={false}>
							{t.refreshLink}
						</Link>
					</>
				) : why === "manual" ? (
					t.manual
				) : (
					t.unreadable
				)}
			</p>
		</div>
	);
}

function OnlySwitch({
	on,
	set,
	label,
}: {
	on: boolean;
	set: (on: boolean) => void;
	label: string;
}) {
	return (
		<label className="opt-check unlock-only">
			<input
				type="checkbox"
				checked={on}
				onChange={(e) => set(e.target.checked)}
			/>
			{label}
		</label>
	);
}

export function CollectionUnlocks({
	items,
	t,
}: {
	items: UnlockItem[];
	t: Copy;
}) {
	const view = useWantedView();
	const [on, setOn] = useStoredSwitch(LOCKED_KEY);
	const hide = useTocHide();
	const shown = view.kind === "ok" ? view.reply : undefined;
	const done = useMemo(
		() =>
			shown
				? items.filter(
						(item) =>
							itemUnlock(shown.collection, item.key, item.entries).state ===
							"all",
					)
				: [],
		[shown, items],
	);
	const hidden = on ? done.map((item) => itemAnchor(item.key)).join("\n") : "";

	useEffect(() => {
		if (!hidden) return;
		hide(new Set(hidden.split("\n")));
		return () => hide(new Set());
	}, [hidden, hide]);

	if (view.kind === "missing") return <MissingNote why={view.why} t={t} />;
	if (!shown) return null;
	const { total } = shown;
	const parts = total.items
		? [fill(t.total, { n: total.unlocked, total: total.items })]
		: [];
	if (total.unread)
		parts.push(
			total.unread === 1 ? t.unreadOne : fill(t.unread, { n: total.unread }),
		);
	return (
		<div className="unlock-head">
			<div className="unlock-bar">
				<p className="field-hint">{parts.join(" · ")}</p>
				<OnlySwitch on={on} set={setOn} label={t.onlyLocked} />
			</div>
			{on && items.length && done.length === items.length ? (
				<p className="field-hint">{t.chapterDone}</p>
			) : null}
		</div>
	);
}

export function UnlockMark({
	itemKey,
	entries,
	t,
}: {
	itemKey: string;
	entries: number;
	t: Copy;
}) {
	const { view } = useContext(UnlocksContext);
	if (view.kind !== "ok") return null;
	const own = itemUnlock(view.reply.collection, itemKey, entries);
	const label =
		own.state === "none"
			? t.itemLocked
			: entries === 1
				? t.itemUnlocked
				: fill(t.itemEntries, { n: own.unlocked, total: entries });
	return (
		<p className="unlock-mark" data-state={own.state}>
			<span
				className="pg-badge"
				data-status={own.state === "all" ? "clear" : undefined}
			>
				{label}
			</span>
			{own.unread ? (
				<span className="pg-badge" data-status="fc">
					{fill(t.itemUnread, { n: own.unread })}
				</span>
			) : null}
		</p>
	);
}

export function AvatarUnlocks({ names, t }: { names: string[]; t: Copy }) {
	const view = useWantedView();
	const [on, setOn] = useStoredSwitch(MISSING_KEY);
	if (view.kind === "missing") return <MissingNote why={view.why} t={t} />;
	if (view.kind !== "ok") return null;
	const owned = names.filter((name) => view.avatars.has(name)).length;
	return (
		<div className="unlock-head">
			<div className="unlock-bar">
				<p className="field-hint">
					{fill(t.avatars, { n: owned, total: names.length })}
				</p>
				<OnlySwitch on={on} set={setOn} label={t.onlyMissing} />
			</div>
			{on && owned === names.length ? (
				<p className="field-hint">{t.avatarsDone}</p>
			) : null}
		</div>
	);
}

export function AvatarMark({ name, t }: { name: string; t: Copy }) {
	const { view } = useContext(UnlocksContext);
	if (view.kind !== "ok" || !view.avatars.has(name)) return null;
	return (
		<span className="avatar-own">
			<Check size={14} weight="bold" aria-hidden />
			<span className="sr-only">{t.owned}</span>
		</span>
	);
}
