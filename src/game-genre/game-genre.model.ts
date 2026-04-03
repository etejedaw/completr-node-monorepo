import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class GameGenre extends Model {
	declare gameId: string;
	declare genreId: string;
}

GameGenre.init(
	{
		gameId: {
			type: DataTypes.UUID,
			primaryKey: true
		},
		genreId: {
			type: DataTypes.UUID,
			primaryKey: true
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["gameId", "genreId"] }],
		timestamps: false
	}
);

export { GameGenre };
