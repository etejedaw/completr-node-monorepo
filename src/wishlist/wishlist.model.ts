import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";

class Wishlist extends Model {
	declare id: string;
	declare userId: string;
	declare gameId: string;
	declare position: number;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Game: Game;
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
