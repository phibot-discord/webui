import assert from "node:assert/strict";
import test from "node:test";
import { illFetchPlan } from "./ill";

test("R2-ready jacket fetch does not fall back to GitHub", () => {
	const prev = process.env.CLOUDFLARE_R2_PUBLIC_BASE;
	process.env.CLOUDFLARE_R2_PUBLIC_BASE = "https://r2.example.test";
	try {
		const plan = illFetchPlan("illLow/Credits.Frums.png");
		assert.equal(plan.r2Key, "original_ill/illLow/Credits.Frums.png");
		assert.equal(plan.githubUrl, undefined);
	} finally {
		if (prev == null) delete process.env.CLOUDFLARE_R2_PUBLIC_BASE;
		else process.env.CLOUDFLARE_R2_PUBLIC_BASE = prev;
	}
});

test("without R2, jackets still have a GitHub URL", () => {
	const prevBase = process.env.CLOUDFLARE_R2_PUBLIC_BASE;
	const prevAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
	const prevToken = process.env.CLOUDFLARE_API_TOKEN;
	const prevBucket = process.env.CLOUDFLARE_R2_BUCKET;
	delete process.env.CLOUDFLARE_R2_PUBLIC_BASE;
	delete process.env.CLOUDFLARE_ACCOUNT_ID;
	delete process.env.CLOUDFLARE_API_TOKEN;
	delete process.env.CLOUDFLARE_R2_BUCKET;
	try {
		const plan = illFetchPlan("chartimg/IN/Credits.Frums.png");
		assert.equal(plan.r2Key, undefined);
		assert.equal(
			plan.githubUrl,
			"https://raw.githubusercontent.com/Catrong/phi-plugin-ill/main/chartimg/IN/Credits.Frums.png",
		);
	} finally {
		if (prevBase == null) delete process.env.CLOUDFLARE_R2_PUBLIC_BASE;
		else process.env.CLOUDFLARE_R2_PUBLIC_BASE = prevBase;
		if (prevAccount == null) delete process.env.CLOUDFLARE_ACCOUNT_ID;
		else process.env.CLOUDFLARE_ACCOUNT_ID = prevAccount;
		if (prevToken == null) delete process.env.CLOUDFLARE_API_TOKEN;
		else process.env.CLOUDFLARE_API_TOKEN = prevToken;
		if (prevBucket == null) delete process.env.CLOUDFLARE_R2_BUCKET;
		else process.env.CLOUDFLARE_R2_BUCKET = prevBucket;
	}
});
