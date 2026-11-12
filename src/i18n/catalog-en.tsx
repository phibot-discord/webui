import { type CatalogProps, CatalogProvider } from "./catalog-context";
import { en } from "./messages";

export default function CatalogEn(props: CatalogProps) {
	return <CatalogProvider {...props} messages={en} />;
}
