import { Platform } from "./platform.model";

export function platformSerializer(platform: Platform) {
	return {
		id: platform.id,
		name: platform.name,
		abbreviation: platform.abbreviation,
		description: platform.description,
		manufacturer: platform.manufacturer,
		generation: platform.generation,
		logoUrl: platform.logoUrl,
		releaseAt: platform.releaseAt,
		updatedAt: platform.updatedAt
	};
}
