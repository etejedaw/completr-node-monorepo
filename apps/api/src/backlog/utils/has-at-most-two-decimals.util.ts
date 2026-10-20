const DECIMAL_PLACES = 2;
const DECIMAL_SCALE = 10 ** DECIMAL_PLACES;
const FLOATING_POINT_TOLERANCE = 1e-6;

export function hasAtMostTwoDecimals(input: number) {
	const scaled = input * DECIMAL_SCALE;
	return Math.abs(scaled - Math.round(scaled)) < FLOATING_POINT_TOLERANCE;
}
