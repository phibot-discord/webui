import { PageSkeleton } from "@/components/PageSkeleton";
import { getMessages } from "@/i18n/server";

export default async function Loading() {
	const { m } = await getMessages();
	return <PageSkeleton className="page-bind" label={m.loading} lines={4} />;
}
