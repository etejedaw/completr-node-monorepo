import { type RewindPlatform } from "../../rewind/rewind.interface";

export function summarizePlatform(platform: RewindPlatform) {
	return {
		name: platform.name,
		abbreviation: platform.abbreviation,
		count: platform.count
	};
}
