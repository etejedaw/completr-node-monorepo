/** Maps RAWG platform slugs to Completr platform codes */
const RAWG_PLATFORM_MAP: Record<string, string> = {
	playstation5: "playstation-5",
	playstation4: "playstation-4",
	playstation3: "playstation-3",
	playstation2: "playstation-2",
	playstation1: "playstation",
	"ps-vita": "playstation-vita",
	psp: "playstation-portable",
	"xbox-series-x": "xbox-series-xors",
	"xbox-one": "xbox-one",
	xbox360: "xbox-360",
	"xbox-old": "xbox",
	"nintendo-switch": "nintendo-switch",
	"wii-u": "nintendo-wii-u",
	wii: "nintendo-wii",
	gamecube: "nintendo-gamecube",
	"nintendo-64": "nintendo-64",
	"nintendo-3ds": "nintendo-3ds",
	"nintendo-ds": "nintendo-ds",
	"game-boy-advance": "game-boy-advance",
	"game-boy-color": "game-boy-color",
	"game-boy": "game-boy",
	snes: "super-nintendo",
	nes: "nintendo-entertainment-system",
	"sega-genesis": "sega-genesis",
	ios: "ios",
	android: "android"
};

/** RAWG "pc" expands to all PC store platforms plus the generic PC option */
const PC_PLATFORMS = [
	"pc",
	"steam",
	"gog",
	"pc-epic-games",
	"ea-origin",
	"origin",
	"blizzard-battlenet"
];

export function mapRawgPlatformSlugs(rawgSlugs: string[]): string[] {
	const codes: string[] = [];

	for (const slug of rawgSlugs) {
		if (slug === "pc") codes.push(...PC_PLATFORMS);
		else {
			const mapped = RAWG_PLATFORM_MAP[slug];
			if (mapped) codes.push(mapped);
		}
	}

	return [...new Set(codes)];
}
