export const AVATAR_PRESET_COUNT = 15;

export const AVATAR_PRESET_PATHS = Array.from(
	{ length: AVATAR_PRESET_COUNT },
	(_, index) =>
		`/avatars/completr_profile_${String(index + 1).padStart(2, "0")}.png`
);
