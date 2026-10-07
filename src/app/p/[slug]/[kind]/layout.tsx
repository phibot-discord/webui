import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicKind } from "@/server/card-kinds";
import { loadShared } from "./load-shared";

/**
 * Checks the link before anything streams, so a revoked or mistyped share
 * link answers 404 (and link previews do not unfurl it as a page)
 */
export default async function PublicKindLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ slug: string; kind: string }>;
}) {
	const { slug, kind } = await params;
	if (!isPublicKind(kind) || !(await loadShared(slug))) notFound();
	return children;
}
