import { FilesSkeleton } from "@/components/FilesSkeleton";
import { getMessages } from "@/i18n/server";
import "@/app/styles/assets.css";
import "@/app/styles/files.css";
import "@/app/styles/pv.css";

export default async function Loading() {
	const { m } = await getMessages();
	const { viewsLabel, views, loading } = m.files;
	return <FilesSkeleton t={{ viewsLabel, views, loading }} />;
}
