import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";

class ListItem extends Model {
	declare id: string;
	declare listId: string;
	declare gameId: string;
	declare position: number;
	declare score?: number;
	declare duration?: number;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Game: Game;
}

ListItem.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		listId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		gameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		position: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		score: DataTypes.FLOAT,
		duration: DataTypes.FLOAT
	},
	{
		sequelize,
		indexes: [
			{ unique: true, fields: ["listId", "gameId"] },
			{ fields: ["listId", "position"] }
		]
	}
);

export { ListItem };
