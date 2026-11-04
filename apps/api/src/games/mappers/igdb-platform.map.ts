import { mapRawgPlatformSlugs } from "./rawg-platform.map";

const IGDB_PC_SLUG = "win";

const PC_PLATFORM_CODES = mapRawgPlatformSlugs(["pc"]);

const IGDB_PLATFORM_MAP: ReadonlyMap<string, string> = new Map([
	["ps", "playstation"],
	["ps2", "playstation-2"],
	["ps3", "playstation-3"],
	["ps4--1", "playstation-4"],
	["ps5", "playstation-5"],
	["psp", "playstation-portable"],
	["psvita", "playstation-vita"],
	["xbox", "xbox"],
	["xbox360", "xbox-360"],
	["xboxone", "xbox-one"],
	["series-x-s", "xbox-series-xors"],
	["switch", "nintendo-switch"],
	["switch-2", "nintendo-switch-2"],
	["wiiu", "nintendo-wii-u"],
	["wii", "nintendo-wii"],
	["ngc", "nintendo-gamecube"],
	["n64", "nintendo-64"],
	["3ds", "nintendo-3ds"],
	["new-3ds", "nintendo-3ds"],
	["nds", "nintendo-ds"],
	["gba", "game-boy-advance"],
	["gbc", "game-boy-color"],
	["gb", "game-boy"],
	["snes", "super-nintendo"],
	["sfam", "super-nintendo"],
	["nes", "nintendo-entertainment-system"],
	["famicom", "nintendo-entertainment-system"],
	["genesis-slash-megadrive", "sega-genesis"],
	["dc", "sega-dreamcast"],
	["ios", "ios"],
	["android", "android"]
]);

export function mapIgdbPlatformSlugs(igdbSlugs: readonly string[]): string[] {
	const codes: string[] = [];

	for (const slug of igdbSlugs) {
		if (slug === IGDB_PC_SLUG) codes.push(...PC_PLATFORM_CODES);
		else {
			const mapped = IGDB_PLATFORM_MAP.get(slug);
			if (mapped) codes.push(mapped);
		}
	}

	return [...new Set(codes)];
}
