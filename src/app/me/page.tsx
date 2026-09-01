import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BindPanel } from "@/components/BindPanel";
import { MeGate } from "@/components/Desk";
import { loadBound, refreshCooldownRemaining } from "@/server/bound";
import { getDataHost } from "@/server/data-host";

export const dynamic = "force-dynamic";

export default async function MePage() {
	const session = await auth();
	if (!session?.user?.id) redirect("/");
	const userId = session.user.id;
	const host = await getDataHost();
	const got = await loadBound(host, userId);
	const cooldown = await refreshCooldownRemaining(userId);

	if ("error" in got) {
		if (got.reason === "not_bound") {
			return (
				<main id="content" className="page page-bind">
					<BindPanel />
				</main>
			);
		}
		return (
			<MeGate
				reason={got.reason === "banned" ? "banned" : "no_save"}
				cooldown={cooldown}
			/>
		);
	}

	redirect("/me/b30");
}
