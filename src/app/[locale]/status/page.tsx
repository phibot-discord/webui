import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusBoard } from "@/components/status/StatusBoard";
import { isLocale } from "@/i18n/config";
import { pageMetadata } from "@/server/og-meta";
import { keepLastPage, loadStatus } from "@/server/status";

export const dynamic = "error";
export const revalidate = 60;

export function generateMetadata(): Promise<Metadata> {
	return pageMetadata("status", { path: "/status" });
}

export default async function StatusPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!isLocale(locale)) notFound();
	const data = await loadStatus();
	if (!data && keepLastPage(process.env)) {
		throw new Error("status source unavailable, keeping the last page");
	}
	return (
		<main id="content" className="page status-board">
			<StatusBoard data={data} refreshMs={revalidate * 1000} />
		</main>
	);
}
