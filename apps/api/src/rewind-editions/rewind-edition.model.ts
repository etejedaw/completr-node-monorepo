import { DataTypes, Model, Sequelize } from "sequelize";

import { sequelize } from "../database/sequelize.database";

class RewindEdition extends Model {
	declare id: string;
	declare year: number;
	declare opensAt: string;
	declare closesAt: string;
	declare graceStartsAt: string;
	declare graceEndsAt: string;
	declare design: string;
	declare premiumRegenerations: number;
	declare giftRegenerations: number;
	declare frozenAt: Date | null;
	declare createdAt: Date;
	declare updatedAt: Date;
}

RewindEdition.init(
	{
		id: {
			type: DataTypes.UUID,
			primaryKey: true,
			allowNull: false,
			defaultValue: Sequelize.literal("gen_random_uuid()")
		},
		year: {
			type: DataTypes.INTEGER,
			allowNull: false,
			unique: true
		},
		opensAt: {
			type: DataTypes.DATEONLY,
			allowNull: false
		},
		closesAt: {
			type: DataTypes.DATEONLY,
			allowNull: false
		},
		graceStartsAt: {
			type: DataTypes.DATEONLY,
			allowNull: false
		},
		graceEndsAt: {
			type: DataTypes.DATEONLY,
			allowNull: false
		},
		design: {
			type: DataTypes.STRING,
			allowNull: false
		},
		premiumRegenerations: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
			validate: { min: 0 }
		},
		giftRegenerations: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
			validate: { min: 0 }
		},
		frozenAt: {
			type: DataTypes.DATE,
			allowNull: true
		}
	},
	{ sequelize }
);

export { RewindEdition };
