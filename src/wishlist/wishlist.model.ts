import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Backlog } from "../backlog/backlog.model";
import { Game } from "../games/game.model";
import { Platform } from "../platforms/platform.model";

interface BacklogWithIncludes extends Backlog {
	Game: Game;
	Platform: Platform;
}

class Wishlist extends Model {
	declare id: string;
	declare userId: string;
	declare backlogId: string;
	declare position: number;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Backlog: BacklogWithIncludes;
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
		backlogId: {
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
		indexes: [{ unique: true, fields: ["userId", "backlogId"] }]
	}
);

export { Wishlist };
