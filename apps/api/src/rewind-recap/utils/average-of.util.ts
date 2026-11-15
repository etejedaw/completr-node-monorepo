import { roundToTenth } from "../../rewind/utils/round-to-tenth.util";

export function averageOf(values: number[]): number | null {
	if (values.length === 0) return null;
	return roundToTenth(
		values.reduce((sum, value) => sum + value, 0) / values.length
	);
}
