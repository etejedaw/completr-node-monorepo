import { DataTypes, Model, Sequelize } from "sequelize";
import { sequelize } from "../database/sequelize.database";
import { SCORE_SOURCES } from "../score-sources/score-source.constants";
import { TIME_SOURCES } from "../game-times/game-time.model";
import { ListItem } from "../list-items/list-item.model";

class List extends Model {
	declare id: string;
	declare userId: string;
	declare name: string;
	declare description?: string;
	declare isPublic: boolean;
	declare scoreSource: string;
	declare durationSource: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare ListItems?: ListItem[];
	declare User?: { id: string; username: string; role: string };
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
		}
	},
	{ sequelize }
);

export { List };
