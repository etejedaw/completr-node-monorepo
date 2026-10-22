import { moodTagsDomainToHttpMapper } from "../../src/mood-tags/errors/mood-tags.domain-to-http.mapper";
import { moodTagsErrorDomainNormalizer } from "../../src/mood-tags/errors/mood-tags.error-domain.normalizer";
import { moodTagsServiceToDomainMapper } from "../../src/mood-tags/errors/mood-tags.service-to-domain.mapper";
import {
	describeDomainToHttpMapper,
	describeModuleErrors
} from "../unit-helpers/error-layers";

describeModuleErrors({
	name: "MoodTags",
	service: "MoodTags Service",
	mapper: moodTagsServiceToDomainMapper,
	normalizer: moodTagsErrorDomainNormalizer,
	cases: [
		{
			serviceCode: "MOOD_TAGS_GAME_NOT_FOUND",
			module: "MoodTags Module",
			code: "MOOD_TAGS_GAME_NOT_FOUND",
			message: "Game not found"
		},
		{
			serviceCode: "MOOD_TAGS_TOO_MANY",
			module: "MoodTags Module",
			code: "MOOD_TAGS_TOO_MANY",
			message: "Too many mood tags for a single game"
		},
		{
			serviceCode: "MOOD_TAGS_TAG_NOT_FOUND",
			module: "MoodTags Module",
			code: "MOOD_TAGS_TAG_NOT_FOUND",
			message: "Mood tag not found for this user"
		},
		{
			serviceCode: "MOOD_TAGS_INVALID_TAG",
			module: "MoodTags Module",
			code: "MOOD_TAGS_INVALID_TAG",
			message: "Invalid mood tag value"
		},
		{
			serviceCode: "MOOD_TAGS_LIMIT_REACHED",
			module: "MoodTags Module",
			code: "MOOD_TAGS_LIMIT_REACHED",
			message: "Tag limit reached for free plan"
		}
	],
	fallback: {
		module: "MoodTags Module",
		code: "MOOD_TAGS_INTERNAL_ERROR",
		message: "Unexpected MoodTags Service error"
	}
});

describeDomainToHttpMapper({
	name: "MoodTags",
	mapper: moodTagsDomainToHttpMapper,
	cases: [
		{ code: "MOOD_TAGS_GAME_NOT_FOUND", status: 404 },
		{ code: "MOOD_TAGS_TOO_MANY", status: 422 },
		{ code: "MOOD_TAGS_TAG_NOT_FOUND", status: 404 },
		{ code: "MOOD_TAGS_INVALID_TAG", status: 422 },
		{ code: "MOOD_TAGS_LIMIT_REACHED", status: 402 }
	]
});
