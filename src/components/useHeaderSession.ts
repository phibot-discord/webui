"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
	type HeaderSession,
	needsSessionLoad,
	SIGNED_OUT,
} from "@/lib/header-session";

const STALE_KEY = "phi-session-stale";

let current = SIGNED_OUT;
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function publish(next: HeaderSession) {
	current = next;
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function readStale(): boolean {
	try {
		return sessionStorage.getItem(STALE_KEY) === "1";
	} catch {
		return false;
	}
}

function writeStale(on: boolean) {
	try {
		if (on) sessionStorage.setItem(STALE_KEY, "1");
		else sessionStorage.removeItem(STALE_KEY);
	} catch {}
}

async function load(path: string) {
	loadedFor = path;
	writeStale(false);
	try {
		const res = await fetch("/api/session", { cache: "no-store" });
		if (res.ok) publish((await res.json()) as HeaderSession);
	} catch {}
}

export function markSessionChanged() {
	writeStale(true);
}

export function useHeaderSession(): HeaderSession {
	const path = usePathname();
	const session = useSyncExternalStore(
		subscribe,
		() => current,
		() => SIGNED_OUT,
	);
	useEffect(() => {
		if (needsSessionLoad(loadedFor, path, readStale())) void load(path);
	}, [path]);
	return session;
}
