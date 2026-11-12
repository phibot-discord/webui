import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import test from "node:test";
import { CARD_KINDS, isPublicKind } from "./card-kinds";

const APP = join(process.cwd(), "src/app");
const HANDLER_BODY =
	/^export (?:async )?function (?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b[\s\S]*?^\}$/gm;
const WRAPPED = /^\treturn (?:await )?authed\(/m;
const UNREADABLE = [
	/^export\s*[{*]/m,
	/^export\s+(?:const|let|var)\s*[{[]/m,
	/^export\s+(?:const|let|var)\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/m,
	/^[ \t]+export\b/m,
];

const PUBLIC_ROUTES = [
	"api/assets",
	"api/auth/[...nextauth]",
	"api/badge/[slug]",
	"api/chart-stats",
	"api/charts",
	"api/guess",
	"api/guess/board",
	"api/guess/ear",
	"api/guess/image",
	"api/guess/run",
	"api/leaderboard",
	"api/locale",
	"api/login/taptap/cancel",
	"api/login/taptap/poll",
	"api/login/taptap/qr",
	"api/login/taptap/qr/image",
	"api/og/[id]",
	"api/og/share/[slug]/[kind]",
	"api/phira",
	"api/phira/extras",
	"api/preview-source",
	"api/public/[slug]/card/[kind]",
	"api/session",
	"render/deduction/font",
];

const OWN_SESSION_CHECK = ["api/chart-board", "api/me/avatar"];

function wrapped(source: string): boolean {
	if (UNREADABLE.some((form) => form.test(source))) return false;
	const found = source.match(HANDLER_BODY) ?? [];
	return found.length > 0 && found.every((body) => WRAPPED.test(body));
}

function routes(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory()
			? routes(join(dir, e.name))
			: e.name === "route.ts"
				? [join(dir, e.name)]
				: [],
	);
}

test("only the listed routes answer without a session", () => {
	const files = [...routes(join(APP, "api")), ...routes(join(APP, "render"))];
	assert.ok(files.length > PUBLIC_ROUTES.length);
	const unwrapped = files
		.filter((file) => !wrapped(readFileSync(file, "utf8")))
		.map((file) => relative(APP, dirname(file)).split(sep).join("/"))
		.sort();
	assert.deepEqual(
		unwrapped,
		[...PUBLIC_ROUTES, ...OWN_SESSION_CHECK].sort(),
		"every handler of a new route must return authed(...) itself, or the route needs a place on one of the lists",
	);
});

test("a route counts as gated only when every handler it can read returns authed itself", () => {
	const gated =
		"export async function POST() {\n\treturn authed(async (userId) => Response.json({ userId }));\n}\n";
	const cases: [string, boolean][] = [
		[gated, true],
		[
			"export async function GET() {\n\tconst session = await auth();\n\treturn Response.json({ user: session?.user?.id ?? null });\n}\n",
			false,
		],
		[
			`${gated}\nexport async function GET() {\n\tconst userId = await sessionUserId();\n\treturn Response.json({ userId });\n}\n`,
			false,
		],
		[
			"export async function GET() {\n\treturn open();\n}\n\nasync function open() {\n\treturn authed(async () => Response.json({}));\n}\n",
			false,
		],
		[
			"export async function GET() {\n\tconst later = () => {\n\t\treturn authed(async () => Response.json({}));\n\t};\n\treturn Response.json({ later: typeof later });\n}\n",
			false,
		],
		[
			"export async function GET() {\n\t// return authed(\n\treturn Response.json({});\n}\n",
			false,
		],
		[`${gated}\nexport const GET = async () => Response.json({});\n`, false],
		[
			`${gated}\nconst open = async () => Response.json({});\nexport { open as GET };\n`,
			false,
		],
		[`${gated}\nexport const { GET } = handlers;\n`, false],
		[
			`${gated}\n  export async function GET() {\n\treturn Response.json({});\n}\n`,
			false,
		],
	];
	for (const [source, expected] of cases) {
		assert.equal(wrapped(source), expected, source);
	}
});

test("only b30, hisb30 and info can be shared", () => {
	assert.deepEqual(CARD_KINDS.filter(isPublicKind), ["b30", "hisb30", "info"]);
});
