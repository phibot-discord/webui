import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { isCardKind } from "@/server/card-kinds";

/**
 * Runs above the loading skeleton (loading.tsx), so a signed-out visitor
 * gets a real redirect and an unknown card a real 404, not a streamed one
 */
export default async function KindLayout({
	children,
	params,
}: {
	children: ReactNode;
	params: Promise<{ kind: string }>;
}) {
	const [session, { kind }] = await Promise.all([auth(), params]);
	if (!session?.user?.id) redirect("/");
	if (!isCardKind(kind)) notFound();
	return children;
}
