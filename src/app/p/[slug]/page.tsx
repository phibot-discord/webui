import { notFound, redirect } from "next/navigation";
import { userIdForSlug } from "@/server/share";

export const dynamic = "force-dynamic";

export default async function PublicHome({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const userId = await userIdForSlug(slug);
	if (!userId) notFound();
	redirect(`/p/${slug}/b30`);
}
