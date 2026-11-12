import { type CatalogProps, CatalogProvider } from "./catalog-context";
import { zh } from "./zh-messages";

export default function CatalogZh(props: CatalogProps) {
	return <CatalogProvider {...props} messages={zh} />;
}
