import { type CommunityTag } from "../../../../core/services/mood-tags.model";
import { type GameTagChip } from "./game-tags.model";

export function buildGameTagChips(
	community: readonly CommunityTag[],
	mine: readonly string[],
	touched: ReadonlySet<string>
): GameTagChip[] {
	const wanted = new Set(mine);
	const known = new Set(community.map(item => item.tag));
	const chips = community.map(item => {
		const isMine = wanted.has(item.tag);
		const othersPlayers = item.players - (item.mine ? 1 : 0);
		return {
			tag: item.tag,
			mine: isMine,
			players: Math.max(0, othersPlayers + (isMine ? 1 : 0))
		};
	});
	const added = mine
		.filter(tag => !known.has(tag))
		.map(tag => ({ tag, mine: true, players: 1 }));
	return [...chips, ...added].filter(
		chip => chip.players > 0 || touched.has(chip.tag)
	);
}
