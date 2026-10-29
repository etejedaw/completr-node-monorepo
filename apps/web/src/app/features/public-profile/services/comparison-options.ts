import { type SegmentedOption } from "../../../shared/components/segmented-control/segmented-control.model";
import { type ComparisonDimension } from "./public-library.model";

export const COMPARISON_OPTIONS: SegmentedOption<ComparisonDimension>[] = [
	{ value: "completed", label: "Completed" },
	{ value: "not_started", label: "To play" }
];
