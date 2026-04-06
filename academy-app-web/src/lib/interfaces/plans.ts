export type Plan = {
	id: string;
	name: string;
	price: number;
	credits: number;
	intervalType: string;
	intervalValue: number;
	isActive: boolean;
	description: string | null;
	_count: { orders: number };
};

export type PlansClientProps = {
	plans: Plan[];
	isAdmin?: boolean;
};

export type { PlanFormValues } from '../validations/plans';

export const INTERVAL_LABEL: Record<string, string> = {
	MONTHLY: 'Reinicio mensual',
	WEEKLY: 'Reinicio semanal',
	FIXED_PACKAGE: 'Paquete fijo',
};

export const INTERVAL_OPTIONS = [
	{ value: 'MONTHLY', label: 'Reinicio mensual' },
	{ value: 'WEEKLY', label: 'Reinicio semanal' },
	{ value: 'FIXED_PACKAGE', label: 'Paquete fijo' },
] as const;

export function getPlanColor(name: string) {
	const n = name.toLowerCase();
	if (n.includes('vip')) {
		return { badge: 'bg-primary text-white', border: 'border-primary' };
	}
	if (n.includes('pro')) {
		return { badge: 'bg-dark text-white', border: 'border-dark' };
	}
	return { badge: 'bg-gray-100 text-gray-700', border: 'border-gray-200' };
}
