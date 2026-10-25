"use client";

import { useRouter } from "next/navigation";
import {
	type ReactNode,
	startTransition,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useOptimistic,
	useRef,
	useState,
} from "react";
import { FrameContext, type Go, type Pending } from "@/components/FilesLink";
import { FilesSkeletonBody, SkeletonBlock } from "@/components/FilesSkeleton";
import { focusMain } from "@/components/SkipLink";
import { navView, parseView } from "@/lib/files-view";

const SKELETON_AFTER_MS = 100;

function filesTarget(href: string): URL | undefined {
	const url = new URL(href, location.href);
	if (url.origin !== location.origin || url.pathname !== "/files") return;
	return url.search === location.search ? undefined : url;
}

function viewOf(search: URLSearchParams) {
	return parseView(search.get("view") ?? undefined);
}

export function FilesSwap({ children }: { children: ReactNode }) {
	const frame = useContext(FrameContext);
	const register = frame?.register;
	useLayoutEffect(() => register?.(), [register]);
	return frame?.shown?.swap ? (
		<>
			<p className="sr-only" role="status">
				{frame.loading}
			</p>
			<div className="files-skeleton page-skeleton" aria-hidden="true">
				<SkeletonBlock view={frame.shown.view} />
			</div>
		</>
	) : (
		children
	);
}

export function FilesFrame({
	nav,
	loading,
	children,
}: {
	nav: ReactNode;
	loading: string;
	children: ReactNode;
}) {
	const router = useRouter();
	const frame = useRef<HTMLElement>(null);
	const swaps = useRef(0);
	const [pending, setPending] = useOptimistic<Pending | undefined>(undefined);
	const [late, setLate] = useState(false);

	const register = useCallback(() => {
		swaps.current += 1;
		return () => {
			swaps.current -= 1;
		};
	}, []);

	const go = useCallback<Go>(
		(href, opts) => {
			const url = filesTarget(href);
			if (!url) return false;
			const to = viewOf(url.searchParams);
			const swap =
				swaps.current > 0 &&
				to === viewOf(new URLSearchParams(location.search));
			startTransition(() => {
				setPending({ view: navView(to), swap });
				const path = `${url.pathname}${url.search}${url.hash}`;
				const nav = { scroll: opts?.scroll ?? true };
				if (opts?.replace) router.replace(path, nav);
				else router.push(path, nav);
			});
			return true;
		},
		[router, setPending],
	);

	useEffect(() => {
		const inside = (node: EventTarget | null) =>
			node instanceof Node && Boolean(frame.current?.contains(node));
		const onClick = (ev: MouseEvent) => {
			if (ev.defaultPrevented || ev.button !== 0) return;
			if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
			const link =
				ev.target instanceof Element ? ev.target.closest("a[href]") : null;
			if (!(link instanceof HTMLAnchorElement) || !inside(link)) return;
			if (link.target && link.target !== "_self") return;
			if (link.hasAttribute("download")) return;
			if (go(link.href)) ev.preventDefault();
		};
		const onSubmit = (ev: SubmitEvent) => {
			const form = ev.target;
			if (ev.defaultPrevented || !(form instanceof HTMLFormElement)) return;
			if (!inside(form) || form.method !== "get") return;
			if (form.target && form.target !== "_self") return;
			const url = new URL(form.action);
			const fields = new FormData(form, ev.submitter);
			url.search = new URLSearchParams(
				[...fields].flatMap(([k, v]) =>
					typeof v === "string" ? [[k, v]] : [],
				),
			).toString();
			if (go(url.href)) ev.preventDefault();
		};
		window.addEventListener("click", onClick);
		window.addEventListener("submit", onSubmit);
		return () => {
			window.removeEventListener("click", onClick);
			window.removeEventListener("submit", onSubmit);
		};
	}, [go]);

	useEffect(() => {
		if (!pending) {
			setLate(false);
			return;
		}
		const timer = window.setTimeout(() => setLate(true), SKELETON_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [pending]);

	const shown = late ? pending : undefined;

	useEffect(() => {
		if (shown && document.activeElement === document.body) focusMain();
	}, [shown]);

	const value = useMemo(
		() => ({ go, pending, shown, loading, register }),
		[go, pending, shown, loading, register],
	);

	return (
		<FrameContext.Provider value={value}>
			<main
				ref={frame}
				id="content"
				className="page files-page"
				aria-busy={shown ? true : undefined}
				data-swap={shown?.swap ? "" : undefined}
			>
				{nav}
				{shown && !shown.swap ? (
					<FilesSkeletonBody view={shown.view} loading={loading} />
				) : (
					children
				)}
			</main>
		</FrameContext.Provider>
	);
}
