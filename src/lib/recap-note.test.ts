import assert from "node:assert/strict";
import test from "node:test";
import {
	cachedReady,
	cacheReady,
	forgetRecapNote,
	markRecapSeen,
	recapSeen,
} from "./recap-note";

function withStore(run: (store: Map<string, string>) => void) {
	const g = globalThis as { window?: unknown };
	const before = g.window;
	const store = new Map<string, string>();
	g.window = {
		localStorage: {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
			removeItem: (k: string) => store.delete(k),
		},
	};
	try {
		run(store);
	} finally {
		g.window = before;
	}
}

test("the answer is kept for one day and a dismissal for the year", () => {
	withStore(() => {
		assert.equal(recapSeen(), false);
		assert.equal(cachedReady("2026-12-01"), undefined);
		cacheReady("2026-12-01", true);
		assert.equal(cachedReady("2026-12-01"), true);
		assert.equal(cachedReady("2026-12-02"), undefined);
		cacheReady("2026-12-02", false);
		assert.equal(cachedReady("2026-12-02"), false);
		markRecapSeen();
		assert.equal(recapSeen(), true);
	});
});

test("signing out forgets both, so the next account asks for itself", () => {
	withStore((store) => {
		cacheReady("2026-12-01", true);
		markRecapSeen();
		assert.equal(store.size, 2);
		forgetRecapNote();
		assert.equal(store.size, 0);
		assert.equal(recapSeen(), false);
		assert.equal(cachedReady("2026-12-01"), undefined);
	});
});

test("blocked storage reads as nothing kept and never throws", () => {
	const g = globalThis as { window?: unknown };
	const before = g.window;
	const denied = () => {
		throw new Error("denied");
	};
	g.window = {
		localStorage: { getItem: denied, setItem: denied, removeItem: denied },
	};
	try {
		assert.equal(recapSeen(), false);
		assert.equal(cachedReady("2026-12-01"), undefined);
		assert.doesNotThrow(() => cacheReady("2026-12-01", true));
		assert.doesNotThrow(markRecapSeen);
		assert.doesNotThrow(forgetRecapNote);
	} finally {
		g.window = before;
	}
});
