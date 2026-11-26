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

test("ct30 draws with the B30 templates in each of its styles", () => {
	assert.deepEqual(CARD_STYLES.ct30, ["classic", "table", "portrait"]);
	assert.equal(cardStyleTemplate("ct30", "table"), "phi/b19/b19-table");
	assert.equal(cardStyleTemplate("ct30", "portrait"), "phi/b19/b19-portrait");
	assert.equal(cardStyleTemplate("ct30", "classic"), undefined);
	assert.equal(classicCardTemplate("ct30"), "phi/b19/b19");
});
