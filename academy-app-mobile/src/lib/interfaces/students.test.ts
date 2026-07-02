import { describe, expect, it } from 'vitest';

import {
  currentSubscription,
  isSubscriptionActive,
  isSubscriptionExpired,
  type Student,
  type Subscription,
} from './students';

function sub(over: Partial<Subscription> = {}): Subscription {
  return {
    id: 's',
    planId: 'p',
    period: '2026-07',
    amount: 8000,
    isPaid: true,
    paidAt: '2026-07-01T00:00:00.000Z',
    expiresAt: null,
    plan: { id: 'p', name: 'Plan' },
    ...over,
  };
}

describe('subscription helpers', () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const past = new Date(Date.now() - 86_400_000).toISOString();

  it('activa: pagada y no vencida', () => {
    expect(isSubscriptionActive(sub({ expiresAt: future }))).toBe(true);
    expect(isSubscriptionExpired(sub({ expiresAt: future }))).toBe(false);
  });

  it('vencida: pagada pero expiró', () => {
    expect(isSubscriptionActive(sub({ expiresAt: past }))).toBe(false);
    expect(isSubscriptionExpired(sub({ expiresAt: past }))).toBe(true);
  });

  it('no pagada nunca es activa ni vencida', () => {
    expect(isSubscriptionActive(sub({ isPaid: false, expiresAt: future }))).toBe(false);
    expect(isSubscriptionExpired(sub({ isPaid: false, expiresAt: past }))).toBe(false);
  });

  it('null / sin expiresAt', () => {
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive(sub({ expiresAt: null }))).toBe(false);
  });

  it('currentSubscription devuelve la primera o null', () => {
    const s1 = sub({ id: 'a' });
    const student = { subscriptions: [s1] } as Student;
    expect(currentSubscription(student)).toBe(s1);
    expect(currentSubscription({ subscriptions: [] } as unknown as Student)).toBeNull();
  });
});
