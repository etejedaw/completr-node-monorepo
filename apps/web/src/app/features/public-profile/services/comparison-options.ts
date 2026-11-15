import { type UiSegmentedOption } from "../../../shared/ui";
import { type ComparisonDimension } from "./public-library.model";

export const COMPARISON_OPTIONS: UiSegmentedOption<ComparisonDimension>[] = [
	{ value: "completed", label: "Completed" },
	{ value: "not_started", label: "To play" }
];
