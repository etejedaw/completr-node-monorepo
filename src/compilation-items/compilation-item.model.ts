import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Game } from "../games/game.model";

class CompilationItem extends Model {
	declare id: string;
	declare parentGameId: string;
	declare childGameId: string;
	declare position: number;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare ParentGame?: Game;
	declare ChildGame?: Game;
}

CompilationItem.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		parentGameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		childGameId: {
			type: DataTypes.UUID,
			allowNull: false
		},
		position: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		}
	},
	{
		sequelize,
		tableName: "CompilationItems",
		indexes: [{ unique: true, fields: ["parentGameId", "childGameId"] }]
	}
);

export { CompilationItem };
