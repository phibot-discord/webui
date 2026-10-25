"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Sources = Record<"game" | "official" | "community", string>;

const clamp = (n: number, lo: number, hi: number) =>
	Math.min(hi, Math.max(lo, n));

const ZOOM_KEY = "tl-zoom";
const MAP_ZOOM_KEY = "tl-map-zoom";
const MAP_ZOOMS = [1, 2, 4, 8, 16];

export function TimelineStage({
	sources,
	zoomLevels,
	zoom: initialZoom,
	children,
}: {
	sources: Sources;
	zoomLevels: string[];
	zoom: number;
	children: ReactNode;
}) {
	const root = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = root.current;
		const track = el?.querySelector<HTMLElement>("[data-tl-track]");
		if (!el || !track) return;
		const plot = el.querySelector<HTMLElement>("[data-tl-map]");
		const mapScroll = el.querySelector<HTMLElement>("[data-tl-map-scroll]");
		const mapBody = plot?.closest<HTMLElement>(".tl-map-body");
		const view = el.querySelector<HTMLElement>("[data-tl-view]");
		const mark = el.querySelector<HTMLElement>("[data-tl-mark]");
		const hair = el.querySelector<HTMLElement>("[data-tl-hair]");
		const tip = el.querySelector<HTMLElement>("[data-tl-tip]");
		const tipTitle = tip?.querySelector<HTMLElement>("[data-tl-tip-title]");
		const tipWhen = tip?.querySelector<HTMLElement>("[data-tl-tip-when]");
		const cards = [...track.querySelectorAll<HTMLElement>("[data-i]")];
		const count = cards.length;
		if (!count) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		const behavior = (): ScrollBehavior => (reduce.matches ? "auto" : "smooth");
		const pct = (i: number) => `${((i + 0.5) / count) * 100}%`;

		const segments = [...track.querySelectorAll<HTMLElement>(".tl-seg")];
		const chips = new Map(
			[...el.querySelectorAll<HTMLAnchorElement>(".tl-jump-list a")].map(
				(a) => [a.hash.slice(1), a],
			),
		);
		const bands = [...(plot?.querySelectorAll<SVGGElement>(".tl-band") ?? [])];

		let lefts: number[] = [];
		let starts: number[] = [];
		let shown: HTMLAnchorElement | undefined;
		const measure = () => {
			const base = track.getBoundingClientRect().left - track.scrollLeft;
			lefts = cards.map((c) => c.getBoundingClientRect().left - base);
			starts = segments.map((s) => s.getBoundingClientRect().left - base);
			for (const band of bands) {
				const label = band.querySelector("text");
				const area = band.querySelector("rect")?.getBoundingClientRect().width;
				if (label && area !== undefined) {
					label.style.visibility =
						label.getComputedTextLength() + 8 > area ? "hidden" : "";
				}
			}
		};
		const indexAtScroll = (x: number) => {
			let lo = 0;
			let hi = count - 1;
			while (lo < hi) {
				const mid = (lo + hi + 1) >> 1;
				if ((lefts[mid] ?? 0) <= x) lo = mid;
				else hi = mid - 1;
			}
			return lo;
		};

		let frame = 0;
		const sync = () => {
			frame = 0;
			const left = track.scrollLeft;
			const max = track.scrollWidth - track.clientWidth;
			el.toggleAttribute("data-at-start", left <= 1);
			el.toggleAttribute("data-at-end", left >= max - 1);
			const probe = left + track.clientWidth * 0.3;
			let current = 0;
			starts.forEach((x, at) => {
				if (x <= probe) current = at;
			});
			const now = chips.get(segments[current]?.id ?? "");
			if (now && now !== shown) {
				shown?.removeAttribute("aria-current");
				now.setAttribute("aria-current", "location");
				shown = now;
				const list = now.closest("ul");
				if (list) {
					const left = now.offsetLeft - list.offsetLeft;
					if (
						left < list.scrollLeft ||
						left + now.offsetWidth > list.scrollLeft + list.clientWidth
					) {
						list.scrollTo({ left: left - 16, behavior: behavior() });
					}
				}
			}
			if (!view) return;
			const a = indexAtScroll(left + 8);
			const b = indexAtScroll(left + track.clientWidth - 8);
			view.style.left = `${(a / count) * 100}%`;
			view.style.width = `${((b - a + 1) / count) * 100}%`;
			view.hidden = false;
			if (mapScroll && plot && plot.offsetWidth > mapScroll.clientWidth) {
				const from = (a / count) * plot.offsetWidth;
				const to = ((b + 1) / count) * plot.offsetWidth;
				const seen = mapScroll.scrollLeft;
				if (from < seen || to > seen + mapScroll.clientWidth) {
					mapScroll.scrollLeft = (from + to) / 2 - mapScroll.clientWidth / 2;
				}
			}
		};
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(sync);
		};

		let selected: HTMLElement | undefined;
		const select = (i: number, scroll: boolean) => {
			const card = cards[i];
			if (!card) return;
			selected?.removeAttribute("data-selected");
			card.setAttribute("data-selected", "");
			selected = card;
			if (mark) {
				mark.style.left = pct(i);
				mark.hidden = false;
			}
			if (!scroll) return;
			const left = (lefts[i] ?? 0) - (track.clientWidth - card.offsetWidth) / 2;
			track.scrollTo({ left: Math.max(0, left), behavior: behavior() });
			const box = track.getBoundingClientRect();
			if (box.top < 0 || box.top > window.innerHeight * 0.6) {
				track.scrollIntoView({ block: "start", behavior: behavior() });
			}
			history.replaceState(null, "", `#${card.id}`);
		};

		const indexAtPointer = (clientX: number) => {
			const box = plot?.getBoundingClientRect();
			if (!box?.width) return 0;
			return clamp(
				Math.floor(((clientX - box.left) / box.width) * count),
				0,
				count - 1,
			);
		};
		const rowAtPointer = (clientY: number) => {
			const box = plot?.getBoundingClientRect();
			const top = Number(plot?.dataset.top ?? 0);
			const h = Number(plot?.dataset.rowH ?? 1);
			if (!box) return -1;
			return Math.floor((clientY - box.top - top) / h);
		};
		const rows = [...(plot?.querySelectorAll<SVGGElement>(".tl-row") ?? [])];
		const labels = [...el.querySelectorAll<HTMLElement>(".tl-map-labels li")];
		let hot = -1;
		const heat = (row: number) => {
			if (row === hot) return;
			rows[hot]?.removeAttribute("data-hot");
			labels[hot]?.removeAttribute("data-hot");
			hot = row >= 0 && row < rows.length ? row : -1;
			rows[hot]?.setAttribute("data-hot", "");
			labels[hot]?.setAttribute("data-hot", "");
			plot?.toggleAttribute("data-hot-any", hot >= 0);
		};
		const showHair = (i: number) => {
			if (!hair) return;
			hair.style.left = pct(i);
			hair.hidden = false;
		};
		const showTip = (i: number) => {
			const card = cards[i];
			if (!tip || !plot || !card) return;
			if (tipTitle)
				tipTitle.textContent =
					card.querySelector("[data-tl-title]")?.textContent ?? "";
			if (tipWhen) {
				const source = sources[card.dataset.source as keyof Sources] ?? "";
				tipWhen.textContent = [card.dataset.when, source]
					.filter(Boolean)
					.join(" · ");
			}
			tip.hidden = false;
			const area = plot.getBoundingClientRect();
			const frame = (mapBody ?? plot).getBoundingClientRect();
			const x = area.left + ((i + 0.5) / count) * area.width - frame.left;
			tip.style.left = `${clamp(x - tip.offsetWidth / 2, 0, Math.max(0, frame.width - tip.offsetWidth))}px`;
		};
		const hideHover = () => {
			if (hair) hair.hidden = true;
			if (tip) tip.hidden = true;
			heat(-1);
		};
		const onPlotMove = (ev: PointerEvent) => {
			const i = indexAtPointer(ev.clientX);
			showHair(i);
			showTip(i);
			heat(rowAtPointer(ev.clientY));
		};
		const onPlotClick = (ev: MouseEvent) => {
			select(indexAtPointer(ev.clientX), true);
		};

		const cardOf = (target: EventTarget | null) =>
			target instanceof Element
				? target.closest<HTMLElement>("[data-i]")
				: null;
		const onCardOver = (ev: PointerEvent) => {
			const card = cardOf(ev.target);
			if (card) showHair(Number(card.dataset.i));
		};
		const onCardOut = (ev: PointerEvent) => {
			if (!cardOf(ev.relatedTarget) && hair) hair.hidden = true;
		};
		const onFocusIn = (ev: FocusEvent) => {
			const card = cardOf(ev.target);
			if (card) showHair(Number(card.dataset.i));
		};

		let drag: { x: number; y: number; left: number; on: boolean } | undefined;
		let swallow = false;
		const onDown = (ev: PointerEvent) => {
			if (ev.pointerType !== "mouse" || ev.button !== 0) return;
			if (
				ev.target instanceof Element &&
				ev.target.closest("a, button, summary, input, select, textarea")
			) {
				return;
			}
			drag = {
				x: ev.clientX,
				y: ev.clientY,
				left: track.scrollLeft,
				on: false,
			};
		};
		const onMove = (ev: PointerEvent) => {
			if (!drag) return;
			const dx = ev.clientX - drag.x;
			if (!drag.on) {
				if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(ev.clientY - drag.y))
					return;
				drag.on = true;
				window.getSelection()?.removeAllRanges();
				track.setAttribute("data-dragging", "");
			}
			track.scrollLeft = drag.left - dx;
		};
		const onUp = () => {
			if (drag?.on) {
				swallow = true;
				track.removeAttribute("data-dragging");
				setTimeout(() => {
					swallow = false;
				}, 0);
			}
			drag = undefined;
		};
		const onClickCapture = (ev: MouseEvent) => {
			if (!swallow) return;
			swallow = false;
			ev.preventDefault();
			ev.stopPropagation();
		};

		const onStep = (ev: MouseEvent) => {
			const button =
				ev.target instanceof Element
					? ev.target.closest<HTMLElement>("[data-tl-step]")
					: null;
			if (!button) return;
			const dir = Number(button.dataset.tlStep) || 1;
			track.scrollBy({
				left: dir * track.clientWidth * 0.8,
				behavior: behavior(),
			});
		};

		const fromHash = (hash: string, scroll: boolean) => {
			let id: string;
			try {
				id = decodeURIComponent(hash.replace(/^#/, ""));
			} catch {
				return false;
			}
			if (!id) return false;
			const target = document.getElementById(id);
			if (!target || !track.contains(target)) return false;
			const card = target.closest<HTMLElement>("[data-i]");
			if (card) {
				select(Number(card.dataset.i), scroll);
				return true;
			}
			if (scroll) {
				const base = track.getBoundingClientRect().left - track.scrollLeft;
				track.scrollTo({
					left: target.getBoundingClientRect().left - base,
					behavior: behavior(),
				});
				history.replaceState(null, "", `#${id}`);
			}
			return true;
		};
		const onLinkClick = (ev: MouseEvent) => {
			if (ev.defaultPrevented || ev.button !== 0) return;
			if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
			const link =
				ev.target instanceof Element
					? ev.target.closest<HTMLAnchorElement>('a[href^="#"]')
					: null;
			if (!link) return;
			if (fromHash(link.hash, true)) ev.preventDefault();
		};
		const onHash = () => {
			fromHash(location.hash, false);
		};

		const zoomBox = el.querySelector<HTMLElement>("[data-tl-zoom-box]");
		const zoomLevel = el.querySelector<HTMLElement>("[data-tl-zoom-level]");
		const zoomButtons = [
			...el.querySelectorAll<HTMLButtonElement>("[data-tl-zoom]"),
		];
		let zoom = Number(el.dataset.zoom ?? initialZoom);
		const setZoom = (next: number, keep: boolean) => {
			const level = clamp(next, 0, zoomLevels.length - 1);
			const center = track.scrollLeft + track.clientWidth / 2;
			const at = indexAtScroll(center);
			const offset = (lefts[at] ?? 0) - track.scrollLeft;
			zoom = level;
			el.dataset.zoom = String(level);
			if (zoomLevel) zoomLevel.textContent = zoomLevels[level] ?? "";
			for (const b of zoomButtons) {
				const dir = Number(b.dataset.tlZoom);
				b.disabled = dir < 0 ? level === 0 : level === zoomLevels.length - 1;
			}
			measure();
			if (keep) track.scrollLeft = (lefts[at] ?? 0) - offset;
			sync();
			if (keep) {
				try {
					localStorage.setItem(ZOOM_KEY, String(level));
				} catch {}
			}
		};
		const onZoom = (ev: MouseEvent) => {
			const button =
				ev.target instanceof Element
					? ev.target.closest<HTMLElement>("[data-tl-zoom]")
					: null;
			if (button) setZoom(zoom + (Number(button.dataset.tlZoom) || 0), true);
		};
		if (zoomBox) zoomBox.hidden = false;

		const mapZoomBox = el.querySelector<HTMLElement>("[data-tl-map-zoom-box]");
		const mapZoomLevel = el.querySelector<HTMLElement>(
			"[data-tl-map-zoom-level]",
		);
		const mapZoomButtons = [
			...el.querySelectorAll<HTMLButtonElement>("[data-tl-map-zoom]"),
		];
		let mapZoom = 0;
		const setMapZoom = (next: number, keep: boolean) => {
			if (!plot) return;
			mapZoom = clamp(next, 0, MAP_ZOOMS.length - 1);
			const scale = MAP_ZOOMS[mapZoom] ?? 1;
			plot.style.width = `${scale * 100}%`;
			if (mapZoomLevel) mapZoomLevel.textContent = `${scale}×`;
			for (const b of mapZoomButtons) {
				const dir = Number(b.dataset.tlMapZoom);
				b.disabled = dir < 0 ? mapZoom === 0 : mapZoom === MAP_ZOOMS.length - 1;
			}
			if (mapScroll) mapScroll.scrollLeft = 0;
			measure();
			sync();
			if (keep) {
				try {
					localStorage.setItem(MAP_ZOOM_KEY, String(mapZoom));
				} catch {}
			}
		};
		const onMapZoom = (ev: MouseEvent) => {
			const button =
				ev.target instanceof Element
					? ev.target.closest<HTMLElement>("[data-tl-map-zoom]")
					: null;
			if (button) {
				setMapZoom(mapZoom + (Number(button.dataset.tlMapZoom) || 0), true);
			}
		};
		if (mapZoomBox && plot) mapZoomBox.hidden = false;

		const onKey = (ev: KeyboardEvent) => {
			if (ev.target !== track || ev.ctrlKey || ev.metaKey || ev.altKey) return;
			if (ev.key === "-" || ev.key === "+" || ev.key === "=") {
				ev.preventDefault();
				setZoom(zoom + (ev.key === "-" ? -1 : 1), true);
				return;
			}
			if (ev.key === "Home" || ev.key === "End") {
				ev.preventDefault();
				track.scrollTo({
					left: ev.key === "Home" ? 0 : track.scrollWidth,
					behavior: behavior(),
				});
			}
		};

		let stored: number | undefined;
		let storedMap: number | undefined;
		try {
			const raw = localStorage.getItem(ZOOM_KEY);
			stored = raw === null ? undefined : Number(raw);
			const rawMap = localStorage.getItem(MAP_ZOOM_KEY);
			storedMap = rawMap === null ? undefined : Number(rawMap);
		} catch {}
		measure();
		setZoom(
			stored !== undefined && Number.isInteger(stored) ? stored : zoom,
			false,
		);
		if (storedMap !== undefined && Number.isInteger(storedMap)) {
			setMapZoom(storedMap, false);
		} else {
			setMapZoom(0, false);
		}
		if (location.hash) fromHash(location.hash, true);
		const resize = new ResizeObserver(() => {
			measure();
			sync();
		});
		resize.observe(track);
		document.fonts?.ready.then(() => {
			measure();
			sync();
		});

		track.addEventListener("scroll", onScroll, { passive: true });
		track.addEventListener("pointerdown", onDown);
		track.addEventListener("pointerover", onCardOver);
		track.addEventListener("pointerout", onCardOut);
		track.addEventListener("focusin", onFocusIn);
		track.addEventListener("click", onClickCapture, true);
		track.addEventListener("keydown", onKey);
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onUp);
		window.addEventListener("hashchange", onHash);
		document.addEventListener("click", onLinkClick);
		el.addEventListener("click", onStep);
		el.addEventListener("click", onZoom);
		el.addEventListener("click", onMapZoom);
		plot?.addEventListener("pointermove", onPlotMove);
		plot?.addEventListener("pointerleave", hideHover);
		plot?.addEventListener("click", onPlotClick);
		return () => {
			resize.disconnect();
			if (frame) cancelAnimationFrame(frame);
			track.removeEventListener("scroll", onScroll);
			track.removeEventListener("pointerdown", onDown);
			track.removeEventListener("pointerover", onCardOver);
			track.removeEventListener("pointerout", onCardOut);
			track.removeEventListener("focusin", onFocusIn);
			track.removeEventListener("click", onClickCapture, true);
			track.removeEventListener("keydown", onKey);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onUp);
			window.removeEventListener("hashchange", onHash);
			document.removeEventListener("click", onLinkClick);
			el.removeEventListener("click", onStep);
			el.removeEventListener("click", onZoom);
			el.removeEventListener("click", onMapZoom);
			plot?.removeEventListener("pointermove", onPlotMove);
			plot?.removeEventListener("pointerleave", hideHover);
			plot?.removeEventListener("click", onPlotClick);
		};
	}, [sources, zoomLevels, initialZoom]);

	return (
		<div ref={root} className="tl-stage" data-zoom={initialZoom}>
			{children}
		</div>
	);
}
