import type { Metadata } from "next";
import Link from "next/link";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
	const { m } = await getMessages();
	return { title: m.notFound.title };
}

export default async function NotFound() {
	const { m } = await getMessages();
	return (
		<main id="content" className="page status-page">
			<p className="status-code">404</p>
			<h1>{m.notFound.title}</h1>
			<p className="lede">{m.notFound.body}</p>
			<div className="status-actions">
				<Link className="btn btn-primary" href="/">
					{m.notFound.home}
				</Link>
			</div>
		</main>
	);
}
