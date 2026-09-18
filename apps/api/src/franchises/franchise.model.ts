import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";
import { type Game } from "../games/game.model";

class Franchise extends Model {
	declare id: string;
	declare name: string;
	declare code: string;
	declare description?: string | null;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Games?: Game[];
}

Franchise.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		name: {
			type: DataTypes.STRING(100),
			allowNull: false,
			unique: true
		},
		code: {
			type: DataTypes.STRING(100),
			allowNull: false,
			unique: true
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: true
		}
	},
	{ sequelize }
);

export { Franchise };
