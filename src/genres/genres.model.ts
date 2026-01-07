import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";

class Genre extends Model {
	declare id: string;
	declare name: string;
	declare code: string;
}

Genre.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		name: {
			type: DataTypes.STRING(50),
			allowNull: false,
			unique: true
		},
		code: {
			type: DataTypes.STRING(50),
			allowNull: false,
			unique: true
		}
	},
	{ sequelize }
);

export { Genre };
