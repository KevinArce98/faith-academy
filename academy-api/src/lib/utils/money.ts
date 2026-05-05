export function sumPrice(orders: Array<{ plan: { price: unknown } }>): number {
	return orders.reduce((sum, o) => sum + Number(o.plan.price), 0);
}
