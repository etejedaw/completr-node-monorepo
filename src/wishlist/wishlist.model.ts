import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";

class Wishlist extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare platformId: string | null;
	declare position: number;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Game: Game;
	declare Platform: Platform | null;
}

Wishlist.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		userId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		platformId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		position: {
			type: DataTypes.INTEGER,
			allowNull: false
		}
	},
	{
		sequelize,
		indexes: [{ unique: true, fields: ["userId", "gameId"] }]
	}
);

export { Wishlist };
