import { type Op } from "sequelize";

export type RangeWhere<T> = { [Op.gte]?: T; [Op.lte]?: T };
