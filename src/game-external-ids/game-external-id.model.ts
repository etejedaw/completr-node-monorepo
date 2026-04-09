import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

export const EXTERNAL_SOURCES = [
	"rawg",
	"igdb",
	"steam",
	"hltb",
	"metacritic",
	"opencritic"
] as const;

export type ExternalSource = (typeof EXTERNAL_SOURCES)[number];

class GameExternalId extends Model {
	declare id: string;
	declare gameId: string;
	declare source: ExternalSource;
	declare externalId: string;
	declare createdAt: Date;
	declare updatedAt: Date;
}

GameExternalId.init(
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
			type: DataTypes.ENUM(...EXTERNAL_SOURCES),
			allowNull: false
		},
		externalId: {
			type: DataTypes.STRING,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["source", "externalId"] }]
	}
);

export { GameExternalId };
