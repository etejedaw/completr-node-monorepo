import { Op, type WhereAttributeHash } from "sequelize";

export function buildActiveGrantsCondition(instant: Date): WhereAttributeHash {
	return {
		[Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: instant } }]
	};
}
