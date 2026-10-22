import { FilesSkeleton } from "@/components/FilesSkeleton";
import { getMessages } from "@/i18n/server";

export default async function Loading() {
	const { m } = await getMessages();
	const { viewsLabel, views, loading } = m.files;
	return <FilesSkeleton t={{ viewsLabel, views, loading }} />;
}
