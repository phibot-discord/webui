import { locale } from "next/root-params";
import { isLocale, type Locale } from "./config";

export async function segmentLocale(): Promise<Locale | undefined> {
	const value = await locale();
	return isLocale(value) ? value : undefined;
}
