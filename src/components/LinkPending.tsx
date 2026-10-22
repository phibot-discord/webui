"use client";

import { useLinkStatus } from "next/link";

export function LinkPending({ className }: { className: string }) {
	const { pending } = useLinkStatus();
	return pending ? <span className={className} aria-hidden="true" /> : null;
}
