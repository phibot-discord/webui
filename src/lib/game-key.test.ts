import assert from "node:assert/strict";
import test from "node:test";
import { GameKeyFormatError, readGameKey } from "./game-key";

const varint = (n: number) => (n < 0x80 ? [n] : [(n & 0x7f) | 0x80, n >> 7]);

const block = (keys: [string, number, number[]][], tail: number[] = []) => {
	const bytes = [...varint(keys.length)];
	for (const [name, bits, flags] of keys) {
		const text = new TextEncoder().encode(name);
		bytes.push(
			...varint(text.length),
			...text,
			1 + flags.length,
			bits,
			...flags,
		);
	}
	bytes.push(...tail);
	return new Uint8Array(bytes);
};

test("an empty block has no keys", () => {
	assert.deepEqual(readGameKey(new Uint8Array([0])), { entries: [], tail: [] });
});

test("a key's type bits become names in bit order", () => {
	const { entries } = readGameKey(block([["Glaciaxion", 0b10101, [3, 1, 2]]]));
	assert.deepEqual(entries, [
		{
			name: "Glaciaxion",
			types: ["read", "collection", "avatar"],
			flags: [3, 1, 2],
		},
	]);
});

test("bytes after the last key are returned as the tail", () => {
	const read = readGameKey(
		block(
			[
				["a", 0b10, [1]],
				["b", 0b1000, [1]],
			],
			[1, 0, 1],
		),
	);
	assert.deepEqual(
		read.entries.map((entry) => entry.name),
		["a", "b"],
	);
	assert.deepEqual(read.tail, [1, 0, 1]);
});

test("a name longer than 127 bytes uses a two-byte length", () => {
	const name = "n".repeat(200);
	const bytes = block([[name, 0b100, [2]]], [7]);
	assert.deepEqual([...bytes.subarray(1, 3)], [0xc8, 0x01]);
	const read = readGameKey(bytes);
	assert.equal(read.entries[0]?.name, name);
	assert.deepEqual(read.entries[0]?.flags, [2]);
	assert.deepEqual(read.tail, [7]);
});

test("a non-ASCII name reads as text", () => {
	const read = readGameKey(block([["光", 0b1, [1]]]));
	assert.equal(read.entries[0]?.name, "光");
	assert.deepEqual(read.tail, []);
});

test("a block that ends inside a key is refused", () => {
	const whole = block([["a", 0b11, [1, 1]]]);
	assert.throws(
		() => readGameKey(whole.subarray(0, whole.length - 1)),
		GameKeyFormatError,
	);
});

test("a key that declares more bytes than remain is refused", () => {
	const bytes = new Uint8Array([1, 1, 0x61, 5, 0b1, 1]);
	assert.throws(() => readGameKey(bytes), GameKeyFormatError);
});

test("a key with a zero length is refused", () => {
	const bytes = new Uint8Array([1, 1, 0x61, 0]);
	assert.throws(() => readGameKey(bytes), GameKeyFormatError);
});
