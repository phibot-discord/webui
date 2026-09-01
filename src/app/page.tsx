import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LandingView } from "@/components/LandingView";
import { safeNext } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

export default async function HomePage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const session = await auth();
	const params = await searchParams;
	const next = safeNext(params.next);
	if (session?.user?.id) redirect(next);
	return <LandingView next={next} />;
}
