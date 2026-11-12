import assert from "node:assert/strict";
import test from "node:test";
import { fCompute } from "./fcompute";

test("plain text comes back unchanged", () => {
	for (const s of ["Player", "名前 テスト", "a_b-c.d"]) {
		assert.equal(fCompute.convertRichText(s), s, s);
	}
});

test("nothing in gives nothing out", () => {
	assert.equal(fCompute.convertRichText(undefined), undefined);
	assert.equal(fCompute.convertRichText(""), "");
});

test("bold, italic and colour become markup", () => {
	assert.equal(fCompute.convertRichText("<b>x</b>"), "<b>x</b>");
	assert.equal(fCompute.convertRichText("<i>x</i>"), "<i>x</i>");
	assert.equal(
		fCompute.convertRichText("<color=#ff0000>x</color>"),
		'<span style="color:#ff0000">x</span>',
	);
	assert.equal(fCompute.convertRichText("<b><i>x</i></b>"), "<b><i>x</i></b>");
	assert.equal(fCompute.convertRichText("a\nb"), "a<br>b");
});

test("replacement patterns in the text are literal", () => {
	for (const s of [
		"<b>$&</b>",
		"<i>$&</i>",
		"<color=red>$&</color>",
		"<b>$`</b>",
		"<b>$'</b>",
		"<b>$1</b>",
		"$$ <b>x</b>",
	]) {
		assert.equal(typeof fCompute.convertRichText(s), "string", s);
	}
	assert.equal(fCompute.convertRichText("<b>$&</b>"), "<b>$&amp;</b>");
});

test("a colour value cannot carry declarations", () => {
	for (const s of [
		"<color=red;font-size:99px>x</color>",
		"<color=url(http://a)>x</color>",
		"<color=#12>x</color>",
	]) {
		assert.equal(
			fCompute.convertRichText(s),
			'<span style="color:inherit">x</span>',
			s,
		);
	}
	assert.equal(
		fCompute.convertRichText('<color="red">x</color>'),
		'<span style="color:red">x</span>',
	);
	assert.equal(
		fCompute.convertRichText("<color=#FFF>x</color>"),
		'<span style="color:#FFF">x</span>',
	);
	assert.equal(
		fCompute.convertRichText("<color=#11223344>x</color>"),
		'<span style="color:#11223344">x</span>',
	);
});

test("markup characters in a name are text", () => {
	assert.equal(
		fCompute.convertRichText(`a & b "q" 'r' <img src="/etc/x.png">`),
		"a &amp; b &quot;q&quot; &#39;r&#39; &lt;img src=&quot;/etc/x.png&quot;&gt;",
	);
});

test("onlyText keeps the words and drops the tags", () => {
	assert.equal(fCompute.convertRichText("<b>x</b>", true), "x");
	assert.equal(fCompute.convertRichText("<color=red>y</color> z", true), "y z");
});

test("very long text is cut and still converts quickly", () => {
	const out = fCompute.convertRichText("<color=".repeat(200_000));
	assert.equal(typeof out, "string");
	assert.ok((out ?? "").length <= 2000 * 6);
});

test("many tags all convert", () => {
	assert.equal(
		fCompute.convertRichText("<b>x</b>".repeat(250)),
		"<b>x</b>".repeat(250),
	);
});
