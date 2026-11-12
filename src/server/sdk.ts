export type RenderedImage = {
	bytes: Buffer;
	mime: string;
	ext: string;
	width: number;
	height: number;
	missingImages?: string[];
	timings?: {
		htmlMs?: number;
		assetsMs?: number;
		measureMs?: number;
		rasterMs?: number;
		encodeMs?: number;
		paintMs?: number;
		heightCache?: "hit" | "miss";
	};
};

export type RenderFormat = "png" | "jpeg" | "webp";

type TemplateHelpers = {
	compileArt: (page: string, data: Record<string, unknown>) => string;
	resources: string;
};

export type TemplateDefinition = {
	id: string;
	width?: number;
	height?: number;
	format?: RenderFormat;
	quality?: number;
	maxRatio?: number;
	html: (
		data: Record<string, unknown>,
		helpers: TemplateHelpers,
	) => string | Promise<string>;
};

export type KvMeta = Record<string, unknown>;

export type Kv = {
	get: (key: string) => Promise<string | undefined>;
	set: (
		key: string,
		value: string,
		ttlMs?: number,
		meta?: KvMeta,
	) => Promise<void>;
	del: (key: string) => Promise<void>;
	keys: (prefix?: string) => Promise<string[]>;
	/** One LIST call per 1,000 keys; meta is what `set` stored, up to 60 s stale */
	list: (prefix: string) => Promise<{ key: string; meta: unknown }[]>;
};

export type FontEntry = {
	name: string;
	data: Buffer;
	weight?: number;
	style?: "normal" | "italic";
	generic?: "sans-serif" | "serif" | "monospace" | "system-ui";
};

export type AppConfig = {
	kv: { accountId: string; namespaceId: string; apiToken: string };
	paths: { phiResources: string };
	render: {
		format: RenderFormat;
		quality: number;
		width: number;
		scale: number;
	};
};

export type App = {
	config: AppConfig;
	db: Kv;
	template: (def: TemplateDefinition) => void;
	fonts: {
		fromDir: (dir: string, map?: Record<string, string>) => Promise<void>;
	};
};

export function defineTemplate(def: TemplateDefinition): TemplateDefinition {
	return def;
}
