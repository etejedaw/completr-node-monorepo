import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class Platform extends Model {
	declare id: string;
	declare name: string;
	declare code: string;
	declare abbreviation: string;
	declare description: string;
	declare manufacturer: string;
	declare generation?: number;
	declare logoUrl?: string;
	declare releaseAt: Date;
	declare createdAt: Date;
	declare updatedAt: Date;
}

Platform.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		name: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		code: {
			type: DataTypes.STRING(100),
			unique: true,
			allowNull: false
		},
		abbreviation: {
			type: DataTypes.STRING(10),
			unique: true,
			allowNull: false
		},
		description: DataTypes.STRING,
		manufacturer: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		generation: DataTypes.SMALLINT,
		logoUrl: DataTypes.STRING,
		releaseAt: DataTypes.DATE
	},
	{ sequelize }
);

export { Platform };
