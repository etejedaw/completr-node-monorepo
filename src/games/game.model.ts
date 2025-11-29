import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class Game extends Model {
	declare id: string;
	declare title: string;
	declare code: string;
	declare description: string;
	declare platforms: string[];
	declare releaseAt?: Date;
	declare coverUrl?: string;
	declare averageScore?: number;
	declare averagePlaytime?: number;
	declare isActive: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
}

Game.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		title: {
			type: DataTypes.STRING(200),
			allowNull: false
		},
		code: {
			type: DataTypes.STRING(200),
			unique: true,
			allowNull: false
		},
		description: DataTypes.STRING,
		platforms: {
			type: DataTypes.ARRAY(DataTypes.STRING),
			allowNull: false
		},
		releaseAt: DataTypes.DATE,
		coverUrl: DataTypes.STRING,
		averageScore: DataTypes.FLOAT,
		averagePlaytime: DataTypes.FLOAT,
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		}
	},
	{ sequelize }
);

export { Game };
