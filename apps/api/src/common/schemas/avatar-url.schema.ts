import z from "zod";

const AVATAR_URL_MAX_LENGTH = 255;
const AVATAR_URL_PROTOCOL = /^https?$/;

export const AvatarUrlSchema = z
	.url({ protocol: AVATAR_URL_PROTOCOL })
	.max(AVATAR_URL_MAX_LENGTH);
