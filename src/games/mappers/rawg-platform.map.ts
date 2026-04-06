/** Maps RAWG platform slugs to Completr platform codes */
export const RAWG_PLATFORM_MAP: Record<string, string> = {
	pc: "pc",
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

export function mapRawgPlatformSlugs(rawgSlugs: string[]): string[] {
	return rawgSlugs
		.map(slug => RAWG_PLATFORM_MAP[slug])
		.filter((code): code is string => !!code);
}
