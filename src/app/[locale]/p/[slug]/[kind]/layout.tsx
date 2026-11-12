import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isPublicKind } from "@/server/card-kinds";
import { loadShared } from "./load-shared";

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
