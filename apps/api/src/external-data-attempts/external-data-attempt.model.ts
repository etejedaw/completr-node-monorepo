import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

export const EXTERNAL_DATA_ATTEMPT_SOURCES = ["metacritic", "hltb"] as const;
export type ExternalDataAttemptSource =
	(typeof EXTERNAL_DATA_ATTEMPT_SOURCES)[number];

export const EXTERNAL_DATA_ATTEMPT_STATUSES = [
	"not_found",
	"ambiguous",
	"no_data",
	"failed"
] as const;
export type ExternalDataAttemptStatus =
	(typeof EXTERNAL_DATA_ATTEMPT_STATUSES)[number];

class ExternalDataAttempt extends Model {
	declare id: string;
	declare gameId: string;
	declare source: ExternalDataAttemptSource;
	declare status: ExternalDataAttemptStatus;
	declare attemptedAt: Date;
	declare createdAt: Date;
	declare updatedAt: Date;
}

ExternalDataAttempt.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		source: {
			type: DataTypes.ENUM(...EXTERNAL_DATA_ATTEMPT_SOURCES),
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM(...EXTERNAL_DATA_ATTEMPT_STATUSES),
			allowNull: false
		},
		attemptedAt: {
			type: DataTypes.DATE,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["gameId", "source"] }]
	}
);

export { ExternalDataAttempt };
