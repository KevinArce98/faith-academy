import { describe, expect, it } from 'vitest';

import { qk, qkRoot } from './queryKeys';

describe('queryKeys', () => {
  it('keys fijas son tuplas estables', () => {
    expect(qk.me).toEqual(['me']);
    expect(qk.plans).toEqual(['plans']);
    expect(qk.assignableTeachers).toEqual(['assignable-teachers']);
  });

  it('dashboard se invalida por prefijo', () => {
    expect(qk.dashboard('ADMIN')).toEqual(['dashboard', 'ADMIN']);
    expect(qk.dashboard()).toEqual(['dashboard', '']);
    // El prefijo ['dashboard'] hace match con ['dashboard', role] en TanStack.
    expect(qk.dashboard('ADMIN')[0]).toBe(qk.dashboard()[0]);
  });

  it('keys parametrizadas incluyen sus argumentos', () => {
    expect(qk.payouts('2026-07')).toEqual(['payouts', '2026-07']);
    expect(qk.monthlyAttendance('2026-07', 'c1')).toEqual(['monthly-attendance', '2026-07', 'c1']);
    expect(qk.sessionAttendance('c1', '2026-07-15')).toEqual(['session-attendance', 'c1', '2026-07-15']);
    expect(qk.studentHistory('s1')).toEqual(['student-history', 's1']);
  });

  it('qkRoot coincide con la raíz de cada key', () => {
    expect(qkRoot.plans).toBe(qk.plans[0]);
    expect(qkRoot.payouts).toBe(qk.payouts('x')[0]);
    expect(qkRoot.monthlyAttendance).toBe(qk.monthlyAttendance('x', 'y')[0]);
    expect(qkRoot.dashboard).toBe(qk.dashboard()[0]);
  });
});
