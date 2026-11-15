import z from "zod";

const AVATAR_URL_MAX_LENGTH = 255;
const AVATAR_URL_PROTOCOL = /^https?$/;
// Preset avatar path served by the web app, e.g. /avatars/completr_profile_07.png
const PRESET_AVATAR_PATH = /^\/avatars\/completr_profile_\d{2}\.png$/;

const RemoteAvatarUrlSchema = z
	.url({ protocol: AVATAR_URL_PROTOCOL })
	.max(AVATAR_URL_MAX_LENGTH);

const PresetAvatarPathSchema = z.string().regex(PRESET_AVATAR_PATH);

export const AvatarUrlSchema = z.union([
	RemoteAvatarUrlSchema,
	PresetAvatarPathSchema
]);
