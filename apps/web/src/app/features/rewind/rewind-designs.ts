import { RewindDesign2025 } from "./components/rewind-design-2025/rewind-design-2025";
import { RewindDesign2026 } from "./components/rewind-design-2026/rewind-design-2026";
import { type RewindDesignEntry } from "./rewind-designs.model";

export const REWIND_DESIGN_REGISTRY: readonly RewindDesignEntry[] = [
	{ key: "2025", component: RewindDesign2025 },
	{ key: "2026", component: RewindDesign2026 }
];

export const LATEST_REWIND_DESIGN =
	REWIND_DESIGN_REGISTRY[REWIND_DESIGN_REGISTRY.length - 1];

export function resolveRewindDesign(
	key: string | null | undefined
): RewindDesignEntry {
	return (
		REWIND_DESIGN_REGISTRY.find(design => design.key === key) ??
		LATEST_REWIND_DESIGN
	);
}
