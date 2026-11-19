import z from "zod";

import { MAX_TAGS_PER_GAME } from "../mood-tags.constants";
import { normalizeTags } from "../normalize-tag.util";

export const MoodTagsFilterSchema = z
	.string()
	.transform(value => normalizeTags(value.split(",")))
	.pipe(z.string().array().min(1).max(MAX_TAGS_PER_GAME));
