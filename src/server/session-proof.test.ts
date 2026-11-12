import assert from "node:assert/strict";
import test from "node:test";
import { proofFor, proofHolds, tokenProof } from "./session-proof";

const TOKEN = "abcdefghijklmnopqrstuvwxy";
const OTHER = "zyxwvutsrqponmlkjihgfedcb";
const DISCORD = "123456789012345678";

function bound(tokens: Record<string, string | undefined>) {
	return async (userId: string) => tokens[userId];
}

test("a proof is stable and does not contain the token", () => {
	const proof = tokenProof(TOKEN);
	assert.equal(proof, tokenProof(TOKEN));
	assert.match(proof, /^[0-9a-f]{32}$/);
	assert.equal(proof.includes(TOKEN), false);
	assert.notEqual(proof, tokenProof(OTHER));
});

test("only a Discord identity gets a proof", () => {
	assert.equal(proofFor(DISCORD, TOKEN), tokenProof(TOKEN));
	assert.equal(proofFor("tap:obj1", TOKEN), undefined);
});

test("the proof holds while the same save is bound", async () => {
	const proof = tokenProof(TOKEN);
	assert.equal(
		await proofHolds(DISCORD, proof, bound({ [DISCORD]: TOKEN })),
		true,
	);
});

test("binding another save or unbinding breaks it", async () => {
	const proof = tokenProof(TOKEN);
	assert.equal(
		await proofHolds(DISCORD, proof, bound({ [DISCORD]: OTHER })),
		false,
	);
	assert.equal(await proofHolds(DISCORD, proof, bound({})), false);
	assert.equal(await proofHolds(DISCORD, proof, async () => null), false);
});

test("a storage failure does not sign the user out", async () => {
	const warns: string[] = [];
	const orig = console.warn;
	console.warn = (...a: unknown[]) => {
		warns.push(a.map(String).join(" "));
	};
	try {
		const holds = await proofHolds(DISCORD, tokenProof(TOKEN), async () => {
			throw new Error("kv down");
		});
		assert.equal(holds, true);
	} finally {
		console.warn = orig;
	}
	assert.equal(warns.length, 1);
	assert.match(warns[0] ?? "", /session proof not checked: kv down/);
	assert.equal(warns[0]?.includes(TOKEN), false);
});
