import { getMessages } from "@/i18n/server";

export default async function NotFound() {
	const { m } = await getMessages();
	return (
		<main id="content" className="page">
			<h1>{m.notFound.title}</h1>
			<p className="lede">{m.notFound.body}</p>
		</main>
	);
}
