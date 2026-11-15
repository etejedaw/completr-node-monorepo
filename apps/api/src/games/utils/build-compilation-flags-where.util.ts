import { type GamesCompilationFlags } from "../games.interface";

export function buildCompilationFlagsWhere(
	flags: GamesCompilationFlags | undefined
): Record<string, unknown> {
	const where: Record<string, unknown> = {};
	if (!flags) return where;
	if (flags.isDlc !== undefined) where["isDlc"] = flags.isDlc;
	if (flags.isCompilation !== undefined) {
		where["isCompilation"] = flags.isCompilation;
	} else if (flags.excludeCompilations) {
		where["isCompilation"] = false;
	}
	return where;
}
