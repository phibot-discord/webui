import { notFound } from "next/navigation";
import { DeductionRender } from "@/components/DeductionRender";
import { parseCollectionLang } from "@/lib/collection";
import { parseParam } from "@/lib/files-view";
import { objectUrls } from "@/server/asset-links";
import { buildDeduction } from "@/server/deduction";

export const dynamic = "force-dynamic";

export default async function DeductionRenderPage({
	searchParams,
}: {
	searchParams: Promise<{ lang?: string | string[] }>;
}) {
	if (process.env.PHI_RENDER !== "1") notFound();
	const view = await buildDeduction(await objectUrls());
	if (!view) notFound();
	const lang =
		parseCollectionLang(parseParam((await searchParams).lang)) ?? "zh-CN";
	return <DeductionRender view={view} lang={lang} />;
}
