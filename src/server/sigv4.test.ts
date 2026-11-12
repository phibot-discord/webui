import assert from "node:assert/strict";
import test from "node:test";
import {
	amzDate,
	canonicalQuery,
	type SigV4Request,
	sha256Hex,
	signV4,
	uriEncode,
} from "./sigv4";

const base: SigV4Request = {
	method: "GET",
	path: "/",
	query: "",
	headers: { host: "example.amazonaws.com", "x-amz-date": "20150830T123600Z" },
	payloadHash: sha256Hex(""),
	region: "us-east-1",
	service: "service",
	accessKeyId: "AKIDEXAMPLE",
	secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
	amzDate: "20150830T123600Z",
};

function signature(over: Partial<SigV4Request> = {}): string {
	return signV4({ ...base, ...over }).slice(-64);
}

test("AWS get-vanilla signs to its published signature", () => {
	const auth = signV4(base);
	assert.ok(
		auth.startsWith(
			"AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=",
		),
		auth,
	);
	assert.equal(
		auth.slice(-64),
		"5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
	);
});

test("a non-ASCII path segment is encoded once (AWS get-utf8)", () => {
	const path = `/${uriEncode("ሴ")}`;
	assert.equal(path, "/%E1%88%B4");
	assert.equal(
		signature({ path }),
		"8318018e0b0f223aa2bbf98705b62bb787dc9c0e678f255a891fd03141be5d85",
	);
});

test("query parameters are encoded and sorted (AWS get-vanilla-utf8-query and get-vanilla-query-order-key-case)", () => {
	const utf8 = canonicalQuery({ ሴ: "bar" });
	assert.equal(utf8, "%E1%88%B4=bar");
	assert.equal(
		signature({ query: utf8 }),
		"2cdec8eed098649ff3a119c94853b13c643bcf08f8b0a1d91e12c9027818dd04",
	);
	const ordered = canonicalQuery({ Param2: "value2", Param1: "value1" });
	assert.equal(ordered, "Param1=value1&Param2=value2");
	assert.equal(
		signature({ query: ordered }),
		"b97d918cfa904a5beff61c982a1b6f458b799221646efd99d3219ec94cdf2500",
	);
});

test("the encoder escapes everything outside the unreserved set", () => {
	assert.equal(
		uriEncode("Revisit(2024 April Fools' Day)!*~.png"),
		"Revisit%282024%20April%20Fools%27%20Day%29%21%2A~.png",
	);
});

test("the request date has no separators", () => {
	assert.equal(
		amzDate(new Date("2015-08-30T12:36:00.000Z")),
		"20150830T123600Z",
	);
});
