import assert from "node:assert/strict";
import test from "node:test";
import { CHANGELOG, markSeen, readSeen, shouldOpen } from "./changelog";
import { CHANGELOG_RELEASES } from "./changelog-sections";

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
	const sections = CHANGELOG_RELEASES.flatMap((r) => r.sections);
	const items = sections.flatMap((s) => s.items);
	assert.ok(items.length >= 10);
	for (const section of sections) {
		assert.ok(section.heading.en && section.heading.zh);
	}
	for (const item of items) {
		assert.ok(item.en.trim() && item.zh.trim(), item.en);
		if (item.href) assert.match(item.href, /^\/(?!\/)/, item.href);
	}
});

test("releases run newest first and the newest is this release", () => {
	assert.equal(CHANGELOG_RELEASES[0]?.date, CHANGELOG.date);
	for (const [i, release] of CHANGELOG_RELEASES.entries()) {
		assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
		assert.ok(release.sections.length, release.date);
		const next = CHANGELOG_RELEASES[i + 1];
		if (next) assert.ok(next.date < release.date, next.date);
	}
});
