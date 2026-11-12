import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export { generateMetadata } from "../not-found";

export default function MissingPage() {
	notFound();
}
