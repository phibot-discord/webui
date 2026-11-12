import assert from "node:assert/strict";
import test, { afterEach, type TestContext } from "node:test";
import JSZip from "jszip";
import {
	encryptSaveEntry,
	isSessionAcceptedError,
	PhigrosCloudError,
	PhigrosUser,
	Summary,
} from "./phigros";
import { Save, type SavePayload } from "./save";
import { SaveHistory } from "./save-history";
import { isTapApiFailure, setTapHttpForTest } from "./tapapi";

const SAVE_URL = "https://example.test/save.zip";

afterEach(() => setTapHttpForTest());

function serve(body: Uint8Array) {
	setTapHttpForTest(async (url) => {
		assert.equal(String(url), SAVE_URL);
		return new Response(new Uint8Array(body));
	});
}

function userWithSave(url = SAVE_URL) {
	const user = new PhigrosUser("a".repeat(25));
	user.saveInfo = {
		gameFile: { url },
		summary: { saveVersion: 6, rankingScore: 12.5, challengeModeRank: 312 },
	} as never;
	return user;
}

type Member = "gameProgress" | "user" | "settings" | "gameRecord";
type Song = {
	id: string;
	levels: { level: number; score: number; acc: number; fc: boolean }[];
};

const USER = {
	showPlayerId: true,
	selfIntro: "Hi 世界",
	avatar: "Cipher1",
	background: "Glaciaxion",
};
const SETTINGS = {
	chordSupport: true,
	fcAPIndicator: false,
	enableHitSound: true,
	lowResolutionMode: false,
	deviceName: "Pixel",
	bright: 0.5,
	musicVolume: 1,
	effectVolume: 0.75,
	hitSoundVolume: 0.25,
	soundOffset: -0.125,
	noteScale: 1.25,
};
const PROGRESS = {
	isFirstRun: false,
	legacyChapterFinished: true,
	alreadyShowCollectionTip: false,
	alreadyShowAutoUnlockINTip: true,
	completed: "3.0",
	songUpdateInfo: 200,
	challengeModeRank: 548,
	money: [1, 2, 3, 1023, 0],
	unlockFlagOfSpasmodic: 1,
	unlockFlagOfIgallta: 2,
	unlockFlagOfRrharil: 3,
	flagOfSongRecordKey: 4,
	randomVersionUnlocked: 5,
	chapter8UnlockBegin: true,
	chapter8UnlockSecondPhase: false,
	chapter8Passed: true,
	chapter8SongUnlocked: 63,
};
const SONGS: Song[] = [
	{
		id: "Glaciaxion.SunsetRay.0",
		levels: [
			{ level: 0, score: 1_000_000, acc: 100, fc: false },
			{ level: 2, score: 987_654, acc: 98.5, fc: true },
			{ level: 4, score: 900_000, acc: 97.25, fc: false },
		],
	},
	{
		id: "Unknown.Song.0",
		levels: [{ level: 3, score: 500_000, acc: 75.25, fc: false }],
	},
];

function varint(n: number) {
	return Buffer.from(n < 128 ? [n] : [(n & 0x7f) | 0x80, n >> 7]);
}
function str(text: string) {
	const bytes = Buffer.from(text, "utf8");
	return Buffer.concat([varint(bytes.length), bytes]);
}
function num(size: 2 | 4, write: (b: Buffer) => unknown) {
	const b = Buffer.alloc(size);
	write(b);
	return b;
}
const u16 = (n: number) => num(2, (b) => b.writeUInt16LE(n));
const i32 = (n: number) => num(4, (b) => b.writeInt32LE(n));
const f32 = (n: number) => num(4, (b) => b.writeFloatLE(n));
const flags = (...on: boolean[]) =>
	Buffer.from([on.reduce((v, set, i) => (set ? v | (1 << i) : v), 0)]);

function recordBytes(
	songs: Song[],
	count = songs.length,
	lengthByte?: number,
	extra = Buffer.alloc(0),
) {
	return Buffer.concat([
		varint(count),
		...songs.map((song) => {
			const levels = [...song.levels].sort((a, b) => a.level - b.level);
			const mask = levels.reduce((m, l) => m | (1 << l.level), 0);
			const fc = levels.reduce((m, l) => (l.fc ? m | (1 << l.level) : m), 0);
			const body = Buffer.concat([
				Buffer.from([mask, fc]),
				...levels.flatMap((l) => [i32(l.score), f32(l.acc)]),
				extra,
			]);
			return Buffer.concat([
				str(song.id),
				Buffer.from([lengthByte ?? body.length]),
				body,
			]);
		}),
	]);
}
const userBytes = (u: typeof USER) =>
	Buffer.concat([
		flags(u.showPlayerId),
		str(u.selfIntro),
		str(u.avatar),
		str(u.background),
	]);
const settingsBytes = (s: typeof SETTINGS) =>
	Buffer.concat([
		flags(
			s.chordSupport,
			s.fcAPIndicator,
			s.enableHitSound,
			s.lowResolutionMode,
		),
		str(s.deviceName),
		...[
			s.bright,
			s.musicVolume,
			s.effectVolume,
			s.hitSoundVolume,
			s.soundOffset,
			s.noteScale,
		].map((n) => f32(n)),
	]);
const progressBytes = (
	p: typeof PROGRESS,
	songUpdateInfo = varint(p.songUpdateInfo),
) =>
	Buffer.concat([
		flags(
			p.isFirstRun,
			p.legacyChapterFinished,
			p.alreadyShowCollectionTip,
			p.alreadyShowAutoUnlockINTip,
		),
		str(p.completed),
		songUpdateInfo,
		u16(p.challengeModeRank),
		...p.money.map((n) => varint(n)),
		Buffer.from([
			p.unlockFlagOfSpasmodic,
			p.unlockFlagOfIgallta,
			p.unlockFlagOfRrharil,
			p.flagOfSongRecordKey,
			p.randomVersionUnlocked,
		]),
		flags(p.chapter8UnlockBegin, p.chapter8UnlockSecondPhase, p.chapter8Passed),
		Buffer.from([p.chapter8SongUnlocked]),
	]);

const sealed = (plain: Buffer, version = 1) =>
	Buffer.concat([Buffer.from([version]), encryptSaveEntry(plain)]);

async function serveSave(overrides: Partial<Record<Member, Buffer>> = {}) {
	const members: Record<Member, Buffer> = {
		gameProgress: sealed(progressBytes(PROGRESS), 3),
		user: sealed(userBytes(USER)),
		settings: sealed(settingsBytes(SETTINGS)),
		gameRecord: sealed(recordBytes(SONGS)),
		...overrides,
	};
	const zip = new JSZip();
	for (const [name, bytes] of Object.entries(members)) zip.file(name, bytes);
	serve(await zip.generateAsync({ type: "uint8array" }));
}

function assertRecords(record: PhigrosUser["gameRecord"]) {
	assert.deepEqual(Object.keys(record), [
		"Glaciaxion.SunsetRay.0",
		"Unknown.Song.0",
	]);
	const first = record["Glaciaxion.SunsetRay.0"]!;
	assert.equal(first.length, 5);
	assert.deepEqual({ ...first[0] }, { fc: true, score: 1_000_000, acc: 100 });
	assert.deepEqual({ ...first[2] }, { fc: true, score: 987_654, acc: 98.5 });
	assert.deepEqual({ ...first[4] }, { fc: false, score: 900_000, acc: 97.25 });
	assert.equal(1 in first, false);
	assert.equal(3 in first, false);
	const second = record["Unknown.Song.0"]!;
	assert.equal(0 in second, false);
	assert.equal(1 in second, false);
	assert.equal(2 in second, false);
	assert.deepEqual({ ...second[3] }, { fc: false, score: 500_000, acc: 75.25 });
}

function blockWarnings(t: TestContext) {
	const warn = t.mock.method(console, "warn", () => {});
	return () =>
		warn.mock.calls
			.map((call) => call.arguments.map(String).join(" "))
			.filter((line) =>
				/save (gameRecord|gameProgress|user|settings)\b/.test(line),
			);
}

test("an archive without a member is refused by name", async () => {
	const zip = new JSZip();
	zip.file("gameProgress", new Uint8Array([1, 2, 3]));
	serve(await zip.generateAsync({ type: "uint8array" }));
	await assert.rejects(() => userWithSave().buildRecord(), /存档缺少/);
});

test("an oversized archive is refused", async () => {
	serve(new Uint8Array(8 * 1024 * 1024 + 1));
	await assert.rejects(() => userWithSave().buildRecord(), /存档文件过大/);
});

test("an empty body is refused", async () => {
	serve(new Uint8Array(0));
	await assert.rejects(() => userWithSave().buildRecord());
});

test("a save URL that fails the host check is not downloaded", async () => {
	let calls = 0;
	setTapHttpForTest(async () => {
		calls += 1;
		return new Response(new Uint8Array(0));
	});
	await assert.rejects(
		() => userWithSave("https://127.0.0.1/save.zip").buildRecord(),
		/存档地址不受信任/,
	);
	assert.equal(calls, 0);
});

test("a summary reads back every field it was written with", () => {
	const bytes = Buffer.concat([
		Buffer.from([6]),
		u16(548),
		f32(15.25),
		varint(130),
		str("Cipher1"),
		...[0, 1, 2, 3].flatMap((l) => [u16(10 + l), u16(20 + l), u16(30 + l)]),
	]);
	const summary = new Summary(bytes.toString("base64"));
	assert.equal(summary.saveVersion, 6);
	assert.equal(summary.challengeModeRank, 548);
	assert.equal(summary.rankingScore, 15.25);
	assert.equal(summary.gameVersion, 130);
	assert.equal(summary.avatar, "Cipher1");
	assert.deepEqual(summary.cleared, [10, 11, 12, 13]);
	assert.deepEqual(summary.fullCombo, [20, 21, 22, 23]);
	assert.deepEqual(summary.phi, [30, 31, 32, 33]);
});

test("a save archive reads back every field of its four members", async () => {
	await serveSave();
	const user = userWithSave();
	assert.equal(await user.buildRecord(), false);
	assert.equal(user.Recordver, 1);
	assert.deepEqual({ ...user.gameuser }, { name: "user", version: 1, ...USER });
	assert.deepEqual({ ...user.gamesettings }, SETTINGS);
	assert.deepEqual({ ...user.gameProgress }, PROGRESS);
	assertRecords(user.gameRecord);
});

test("a parsed save builds a Save with the same records and holes", async () => {
	await serveSave();
	const user = userWithSave();
	await user.buildRecord();
	const save = new Save(user as unknown as SavePayload);
	const first = save.gameRecord["Glaciaxion.SunsetRay.0"]!;
	assert.equal(first[0]!.rank, "EZ");
	assert.equal(first[0]!.fc, true);
	assert.equal(first[2]!.rank, "IN");
	assert.equal(first[4]!.rank, "LEGACY");
	assert.equal(1 in first, false);
	const at = save.gameRecord["Unknown.Song.0"]![3]!;
	assert.equal(at.rank, "AT");
	assert.equal(at.difficulty, 0);
	assert.equal(at.rks, 0);
	assert.equal(save.getRecord().length, 3);
	assert.deepEqual(save.gameProgress.money, [1, 2, 3, 1023, 0]);
	assert.equal(save.gameuser.selfIntro, "Hi 世界");
});

test("a healthy archive with two-byte counts and lengths reads to the expected stored JSON and logs nothing", async (t) => {
	const warnings = blockWarnings(t);
	const songs: Song[] = [
		...SONGS,
		{
			id: `${"Long".repeat(40)}.Song.0`,
			levels: [0, 1, 2, 3, 4].map((level) => ({
				level,
				score: 990_000 + level,
				acc: 99.5,
				fc: level % 2 === 0,
			})),
		},
		...Array.from({ length: 140 }, (_, i) => ({
			id: `Many.Song${i}.0`,
			levels: [{ level: 1, score: 600_000 + i, acc: 80.5, fc: false }],
		})),
	];
	const gameuser = {
		name: "user",
		version: 1,
		...USER,
		selfIntro: "世界".repeat(30),
	};
	const progress = {
		...PROGRESS,
		songUpdateInfo: 16383,
		money: [1023, 1023, 1023, 1023, 1023],
	};
	await serveSave({
		gameRecord: sealed(recordBytes(songs)),
		user: sealed(userBytes(gameuser)),
		gameProgress: sealed(progressBytes(progress), 3),
	});
	const user = userWithSave();
	await user.buildRecord();
	const gameRecord = Object.fromEntries(
		songs.map((song) => {
			const row: { fc: boolean; score: number; acc: number }[] = [];
			for (const l of song.levels)
				row[l.level] = {
					fc: l.fc || (l.score === 1_000_000 && l.acc === 100),
					score: l.score,
					acc: l.acc,
				};
			return [song.id, row];
		}),
	);
	assert.equal(
		JSON.stringify({
			gameRecord: user.gameRecord,
			gameProgress: user.gameProgress,
			gameuser: user.gameuser,
			gamesettings: user.gamesettings,
			Recordver: user.Recordver,
		}),
		JSON.stringify({
			gameRecord,
			gameProgress: progress,
			gameuser,
			gamesettings: SETTINGS,
			Recordver: 1,
		}),
	);
	assert.deepEqual(warnings(), []);
});

test("an empty record block reads as no scores", async (t) => {
	const warnings = blockWarnings(t);
	await serveSave({ gameRecord: sealed(Buffer.alloc(0)) });
	const user = userWithSave();
	assert.equal(await user.buildRecord(), false);
	assert.deepEqual(user.gameRecord, {});
	assert.deepEqual({ ...user.gameuser }, { name: "user", version: 1, ...USER });
	assert.deepEqual(warnings(), []);
});

test("a song length that runs past the record block refuses the records", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ gameRecord: sealed(recordBytes(SONGS, 99, 0xff)) });
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.deepEqual(user.gameRecord, {});
	assert.equal(user.gameProgress, undefined);
	assert.match(
		warnings().join("\n"),
		/save gameRecord refused: song length past the block/,
	);
});

test("a song with bytes after its known fields refuses the records", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({
		gameRecord: sealed(
			recordBytes(SONGS, SONGS.length, undefined, Buffer.from([7, 7, 7])),
		),
	});
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.match(
		warnings().join("\n"),
		/save gameRecord refused: song length does not match its levels/,
	);
});

test("a song length that runs to the end of the block refuses the records instead of keeping the first song", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	const four: Song[] = ["A", "B", "C", "D"].map((name) => ({
		id: `${name}.Four.0`,
		levels: [{ level: 2, score: 900_000, acc: 99, fc: false }],
	}));
	const bytes = recordBytes(four);
	const at = 2 + Buffer.byteLength(four[0]!.id);
	bytes.writeUInt8(bytes.length - at - 1, at);
	await serveSave({ gameRecord: sealed(bytes) });
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.match(
		warnings().join("\n"),
		/save gameRecord refused: song length does not match its levels/,
	);
});

test("an empty game record member is refused as unreadable", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ gameRecord: Buffer.alloc(0) });
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.match(warnings().join("\n"), /save gameRecord refused: empty member/);
});

test("a song length shorter than its fields refuses the records", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ gameRecord: sealed(recordBytes(SONGS, 2, 2)) });
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.match(
		warnings().join("\n"),
		/save gameRecord refused: song length does not match its levels/,
	);
});

test("a record count longer than two bytes refuses the records", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({
		gameRecord: sealed(
			Buffer.concat([
				Buffer.from([0x80, 0x80, 0x01]),
				recordBytes(SONGS).subarray(1),
			]),
		),
	});
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.match(
		warnings().join("\n"),
		/save gameRecord refused: number longer than two bytes/,
	);
});

test("a game record that fails to decrypt is refused with the record error", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	const bad = encryptSaveEntry(recordBytes(SONGS));
	const at = bad.length - 17;
	bad.writeUInt8(bad.readUInt8(at) ^ 0xff, at);
	await serveSave({ gameRecord: Buffer.concat([Buffer.from([1]), bad]) });
	await assert.rejects(() => user.buildRecord(), /存档成绩数据无法读取/);
	assert.equal(user.gameuser, undefined);
	assert.match(
		warnings().join("\n"),
		/save gameRecord refused: decryption failed/,
	);
});

test("a progress number longer than two bytes stops the progress block and keeps the fields before it", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({
		gameProgress: sealed(
			progressBytes(PROGRESS, Buffer.from([0x80, 0x80, 0x02])),
			3,
		),
	});
	await user.buildRecord();
	assert.deepEqual(
		{ ...user.gameProgress },
		{
			isFirstRun: false,
			legacyChapterFinished: true,
			alreadyShowCollectionTip: false,
			alreadyShowAutoUnlockINTip: true,
			completed: "3.0",
		},
	);
	assertRecords(user.gameRecord);
	assert.match(
		warnings().join("\n"),
		/save gameProgress read stopped: number longer than two bytes/,
	);
});

test("a game record of another version is refused before any other member is read", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ gameRecord: sealed(recordBytes(SONGS), 2) });
	user.gameRecord = { stale: [] } as never;
	await assert.rejects(() => user.buildRecord(), /版本号已更新/);
	assert.deepEqual(user.gameRecord, {});
	assert.equal(user.gameProgress, undefined);
	assert.equal(user.gameuser, undefined);
	assert.equal(user.gamesettings, undefined);
	assert.match(warnings().join("\n"), /save gameRecord version 2 refused/);
});

test("a settings member that fails to decrypt is left unread and the refresh goes on", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	const bad = encryptSaveEntry(settingsBytes(SETTINGS));
	const at = bad.length - 17;
	bad.writeUInt8(bad.readUInt8(at) ^ 0xff, at);
	await serveSave({ settings: Buffer.concat([Buffer.from([1]), bad]) });
	assert.equal(await user.buildRecord(), false);
	assert.equal(user.gamesettings, undefined);
	assert.deepEqual({ ...user.gameuser }, { name: "user", version: 1, ...USER });
	assertRecords(user.gameRecord);
	assert.match(
		warnings().join("\n"),
		/save settings not read: decryption failed/,
	);
});

test("a settings member cut inside a float keeps the fields before the cut and logs the block", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({
		settings: sealed(settingsBytes(SETTINGS).subarray(0, 21)),
	});
	await user.buildRecord();
	assert.deepEqual(
		{ ...user.gamesettings },
		{
			chordSupport: true,
			fcAPIndicator: false,
			enableHitSound: true,
			lowResolutionMode: false,
			deviceName: "Pixel",
			bright: 0.5,
			musicVolume: 1,
			effectVolume: 0.75,
		},
	);
	assertRecords(user.gameRecord);
	const lines = warnings();
	assert.equal(lines.length, 1);
	assert.match(lines[0]!, /save settings read stopped: cut at byte 19/);
	assert.equal(
		lines.some(
			(line) => line.includes("Pixel") || line.includes("a".repeat(25)),
		),
		false,
	);
});

test("a progress member cut before its last byte keeps the fields before the cut and logs the block", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	const plain = progressBytes(PROGRESS);
	await serveSave({
		gameProgress: sealed(plain.subarray(0, plain.length - 1), 3),
	});
	await user.buildRecord();
	const { chapter8SongUnlocked: _cut, ...before } = PROGRESS;
	assert.deepEqual({ ...user.gameProgress }, before);
	assert.match(
		warnings().join("\n"),
		/save gameProgress read stopped: cut at byte/,
	);
});

test("a progress block cut before its money builds a Save with zero money and adds no data point to the history", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({
		gameProgress: sealed(progressBytes(PROGRESS).subarray(0, 9), 3),
	});
	await user.buildRecord();
	assert.equal(user.gameProgress?.challengeModeRank, 548);
	assert.equal("money" in user.gameProgress!, false);
	user.saveInfo!.modifiedAt = { iso: new Date(Date.UTC(2026, 0, 1)) };
	const save = new Save(user as unknown as SavePayload);
	assert.deepEqual(save.gameProgress.money, [0, 0, 0, 0, 0]);
	const history = new SaveHistory(null);
	history.update(save);
	assert.equal(history.data.length, 0);
	assert.match(
		warnings().join("\n"),
		/save gameProgress read stopped: cut at byte 9/,
	);
});

test("a user member cut inside its background keeps the fields before it and logs the block", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	const plain = userBytes(USER);
	await serveSave({ user: sealed(plain.subarray(0, plain.length - 3)) });
	await user.buildRecord();
	assert.deepEqual(
		{ ...user.gameuser },
		{
			name: "user",
			version: 1,
			showPlayerId: true,
			selfIntro: "Hi 世界",
			avatar: "Cipher1",
		},
	);
	assert.match(warnings().join("\n"), /save user read stopped: cut at byte/);
});

test("a progress member of an unknown version is read with the known layout and logged", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ gameProgress: sealed(progressBytes(PROGRESS), 7) });
	await user.buildRecord();
	assert.deepEqual({ ...user.gameProgress }, PROGRESS);
	const lines = warnings();
	assert.equal(lines.length, 1);
	assert.match(lines[0]!, /save gameProgress version 7 is newer than 6/);
	for (const version of [6, 3]) {
		await serveSave({
			gameProgress: sealed(progressBytes(PROGRESS), version),
		});
		const same = userWithSave();
		await same.buildRecord();
		assert.deepEqual({ ...same.gameProgress }, PROGRESS);
	}
	assert.equal(
		warnings().filter((line) => /save gameProgress version/.test(line)).length,
		1,
	);
});

test("a user member of an unknown version is read with the known layout and logged", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ user: sealed(userBytes(USER), 7) });
	await user.buildRecord();
	assert.deepEqual({ ...user.gameuser }, { name: "user", version: 1, ...USER });
	const lines = warnings();
	assert.equal(lines.length, 1);
	assert.match(lines[0]!, /save user version 7 is newer than 1/);
});

test("a settings member of an unknown version is read with the known layout and logged", async (t) => {
	const warnings = blockWarnings(t);
	const user = userWithSave();
	await serveSave({ settings: sealed(settingsBytes(SETTINGS), 7) });
	await user.buildRecord();
	assert.deepEqual({ ...user.gamesettings }, SETTINGS);
	const lines = warnings();
	assert.equal(lines.length, 1);
	assert.match(lines[0]!, /save settings version 7 is newer than 1/);
});

function cloud(me: () => Response, saves: () => Response = me) {
	setTapHttpForTest(async (url) => {
		const path = new URL(String(url)).pathname;
		if (path.endsWith("/users/me")) return me();
		if (path.includes("/gamesaves/")) return saves();
		assert.fail(`unexpected ${path}`);
	});
}

const cloudError = () =>
	new PhigrosUser("a".repeat(25)).getSaveInfo().then(
		() => assert.fail("getSaveInfo resolved"),
		(err: unknown) => err,
	);

test("a cloud rejection keeps its status and numeric code, not the body text", async () => {
	cloud(
		() =>
			new Response(JSON.stringify({ code: 4242, error: "made-up body text" }), {
				status: 400,
			}),
	);
	const err = await cloudError();
	assert.ok(err instanceof PhigrosCloudError);
	assert.equal(err.status, 400);
	assert.equal(err.code, 4242);
	assert.match(err.message, /^Phigros cloud 400/);
	assert.equal(err.message.includes("made-up body text"), false);
	assert.equal(isSessionAcceptedError(err), false);
});

test("a cloud rejection without a numeric code in its body has no code", async () => {
	cloud(() => new Response("not json", { status: 401 }));
	const err = await cloudError();
	assert.ok(err instanceof PhigrosCloudError);
	assert.equal(err.status, 401);
	assert.equal(err.code, undefined);
});

test("an empty save list after the account answered is marked as accepted by the region", async () => {
	cloud(
		() => Response.json({ objectId: "u1" }),
		() => Response.json({ results: [] }),
	);
	const err = await cloudError();
	assert.ok(err instanceof Error);
	assert.match(err.message, /存档列表为空/);
	assert.equal(isSessionAcceptedError(err), true);
});

test("an outage after the account answered is still an outage and is marked as accepted", async () => {
	cloud(
		() => Response.json({ objectId: "u1" }),
		() => new Response("", { status: 503 }),
	);
	const err = await cloudError();
	assert.equal(isTapApiFailure(err), true);
	assert.equal(isSessionAcceptedError(err), true);
});

test("an account answer without an objectId is not taken as acceptance", async () => {
	cloud(
		() => Response.json({}),
		() => Response.json({ results: [] }),
	);
	const err = await cloudError();
	assert.ok(err instanceof Error);
	assert.match(err.message, /存档列表为空/);
	assert.equal(isSessionAcceptedError(err), false);
});
