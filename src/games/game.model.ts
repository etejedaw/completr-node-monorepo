import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { Platform } from "../platforms/platform.model";

class Game extends Model {
	declare id: string;
	declare title: string;
	declare code: string;
	declare description: string;
	declare releaseAt?: Date;
	declare coverUrl?: string;
	declare isDlc: boolean;
	declare isActive: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare Platforms: Platform[];
}

Game.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
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
		releaseAt: DataTypes.DATE,
		coverUrl: DataTypes.STRING,
		isDlc: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		isActive: {
			type: DataTypes.BOOLEAN,
			defaultValue: true
		}
	},
	{ sequelize }
);

export { Game };
