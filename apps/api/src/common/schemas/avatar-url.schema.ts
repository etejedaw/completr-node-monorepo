import z from "zod";

import { AVATAR_PRESET_PATHS } from "../constants/avatar.constants";

export const AvatarUrlSchema = z
	.string()
	.refine(value => AVATAR_PRESET_PATHS.includes(value), {
		message: "Choose one of the preset avatars"
	});
