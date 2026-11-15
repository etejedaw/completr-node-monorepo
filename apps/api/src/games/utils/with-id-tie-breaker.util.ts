import { type Order } from "sequelize";

export function withIdTieBreaker(order: Order, sortOrder: string): Order {
	if (!Array.isArray(order) || order.length === 0) return order;
	const [first] = order;
	if (typeof first === "object" && "val" in first && first.val === "RANDOM()")
		return order;
	const direction = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
	return [...order, ["id", direction]];
}
