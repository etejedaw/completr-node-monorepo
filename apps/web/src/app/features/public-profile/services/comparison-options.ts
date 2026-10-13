import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control";
import { type ComparisonDimension } from "./public-library.service";

export const COMPARISON_OPTIONS: SegmentedOption<ComparisonDimension>[] = [
	{ value: "completed", label: "Completed" },
	{ value: "not_started", label: "To play" }
];
