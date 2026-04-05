import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { SCORE_SOURCES } from "../game-scores/game-score.model";
import { TIME_SOURCES } from "../game-times/game-time.model";

class List extends Model {
	declare id: string;
	declare userId: string;
	declare name: string;
	declare slug: string;
	declare description?: string;
	declare isPublic: boolean;
	declare scoreSource: string;
	declare durationSource: string;
	declare basedOnId?: string;
	declare isFork: boolean;
	declare createdAt: Date;
	declare updatedAt: Date;
}

List.init(
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
		name: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		slug: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		description: DataTypes.TEXT,
		isPublic: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		scoreSource: {
			type: DataTypes.ENUM(...SCORE_SOURCES),
			allowNull: false
		},
		durationSource: {
			type: DataTypes.ENUM(...TIME_SOURCES),
			allowNull: false
		},
		basedOnId: {
			type: DataTypes.UUID,
			allowNull: true
		},
		isFork: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		}
	},
	{ sequelize }
);

export { List };
