import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../../database/sequelize.database";
import { type Game } from "../../games/game.model";

class ActivityGame extends Model {
	declare id: string;
	declare activityId: string;
	declare gameId: string;
	declare Game: Game;
}

ActivityGame.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		activityId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		}
	},
	{
		sequelize,
		timestamps: false,
		indexes: [{ unique: true, fields: ["activityId"] }]
	}
);

export { ActivityGame };
