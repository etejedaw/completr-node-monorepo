import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class ScoreSource extends Model {
	declare id: string;
	declare code: string;
	declare name: string;
	declare scale: number;
	declare createdAt: Date;
	declare updatedAt: Date;
}

ScoreSource.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		code: {
			type: DataTypes.STRING(50),
			unique: true,
			allowNull: false
		},
		name: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		scale: {
			type: DataTypes.INTEGER,
			allowNull: false
		}
	},
	{ sequelize }
);

export { ScoreSource };
