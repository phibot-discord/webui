import assert from "node:assert/strict";
import test from "node:test";
import { CHANGELOG, markSeen, readSeen, shouldOpen } from "./changelog";
import { CHANGELOG_SECTIONS } from "./changelog-sections";

test("the dialog opens once per version, and never by itself without storage", () => {
	assert.equal(shouldOpen(null, "v2"), true);
	assert.equal(shouldOpen("v1", "v2"), true);
	assert.equal(shouldOpen("v2", "v2"), false);
	assert.equal(shouldOpen(undefined, "v2"), false);
});

test("storage that throws reads as unavailable and a dismissal is dropped", () => {
	const g = globalThis as { window?: unknown };
	const before = g.window;
	g.window = {
		localStorage: {
			getItem() {
				throw new Error("denied");
			},
			setItem() {
				throw new Error("denied");
			},
		},
	};
	try {
		assert.equal(readSeen(), undefined);
		assert.doesNotThrow(() => markSeen("v2"));
	} finally {
		g.window = before;
	}
	const store = new Map<string, string>();
	g.window = {
		localStorage: {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		},
	};
	try {
		assert.equal(readSeen(), null);
		markSeen("v2");
		assert.equal(readSeen(), "v2");
	} finally {
		g.window = before;
	}
});

test("every item reads in both languages and links only inside the site", () => {
	assert.ok(CHANGELOG.version.trim());
	assert.match(CHANGELOG.date, /^\d{4}-\d{2}-\d{2}$/);
	const items = CHANGELOG_SECTIONS.flatMap((s) => s.items);
	assert.ok(items.length >= 10);
	for (const section of CHANGELOG_SECTIONS) {
		assert.ok(section.heading.en && section.heading.zh);
	}
	for (const item of items) {
		assert.ok(item.en.trim() && item.zh.trim(), item.en);
		if (item.href) assert.match(item.href, /^\/[^/]/, item.href);
	}
});
