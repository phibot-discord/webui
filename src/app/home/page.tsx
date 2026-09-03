import { auth } from "@/auth";
import { LandingView } from "@/components/LandingView";

export const dynamic = "force-dynamic";

export default async function HomePage() {
	const session = await auth();
	return <LandingView next="/me" signedIn={Boolean(session?.user?.id)} />;
}
