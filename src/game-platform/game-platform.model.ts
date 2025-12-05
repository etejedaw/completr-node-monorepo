import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class GamePlatform extends Model {
	declare gameId: string;
	declare platformId: string;
}

GamePlatform.init(
	{
		gameId: {
			type: DataTypes.UUID,
			primaryKey: true
		},
		platformId: {
			type: DataTypes.UUID,
			primaryKey: true
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["gameId", "platformId"] }],
		timestamps: false
	}
);

export { GamePlatform };
