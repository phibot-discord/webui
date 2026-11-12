import assert from "node:assert/strict";
import test from "node:test";
import { artFactories } from "@/phi/art-compiled";
import {
	CARD_STYLES,
	cardStyleTemplate,
	classicCardTemplate,
	type StyledKind,
} from "./card-styles";

function artFactoryKey(templateId: string): string {
	return `${templateId.replace(/^phi\//, "")}.art`;
}

test("every card style has a compiled template", () => {
	const missing: string[] = [];
	for (const kind of Object.keys(CARD_STYLES) as StyledKind[]) {
		for (const style of CARD_STYLES[kind]) {
			const id = cardStyleTemplate(kind, style) ?? classicCardTemplate(kind);
			if (!Object.hasOwn(artFactories, artFactoryKey(id))) {
				missing.push(`${kind}/${style}: ${id}`);
			}
		}
	}
	assert.deepEqual(missing, []);
});
