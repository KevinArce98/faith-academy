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
};

export function getPlanBadgeColor(name: string): { bg: string; text: string } {
  const n = name.toLowerCase();
  if (n.includes('vip')) return { bg: 'bg-primary', text: 'text-white' };
  if (n.includes('pro')) return { bg: 'bg-dark', text: 'text-white' };
  return { bg: 'bg-gray-100', text: 'text-gray-700' };
}
