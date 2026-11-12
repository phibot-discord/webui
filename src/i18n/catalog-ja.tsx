import { type CatalogProps, CatalogProvider } from "./catalog-context";
import { ja } from "./ja-messages";

export default function CatalogJa(props: CatalogProps) {
	return <CatalogProvider {...props} messages={ja} />;
}
