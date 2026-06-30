export type Plan = {
  id: string;
  name: string;
  price: number;
  classesPerWeek: number;
  isPublic: boolean;
  isSingleClass: boolean;
  isActive: boolean;
  description: string | null;
  _count: { subscriptions: number };
  /** @deprecated sistema de créditos aparcado (fase 2) */
  credits?: number;
};

export type PlansClientProps = {
  plans: Plan[];
  isAdmin?: boolean;
};

export type { PlanFormValues } from '../validations/plans';

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
