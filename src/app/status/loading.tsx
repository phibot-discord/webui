import { PageSkeleton } from "@/components/PageSkeleton";
import { getMessages } from "@/i18n/server";

export default async function Loading() {
	const { m } = await getMessages();
	return <PageSkeleton className="status-board" label={m.loading} lines={10} />;
}
