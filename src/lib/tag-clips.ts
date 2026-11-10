import data from "./tag-clips.json";

type TagClip = {
	id: string;
	level: string;
	start: number;
	votes: number;
	total: number;
};

export type TagClipFile = {
	v: number;
	length: number;
	clips: Record<string, TagClip>;
};

export const TAG_CLIPS = data as TagClipFile;
