import { describe, expect, it } from 'vitest';

import { qk, qkRoot } from './queryKeys';

describe('queryKeys', () => {
  it('keys fijas son tuplas estables', () => {
    expect(qk.me).toEqual(['me']);
    expect(qk.plans).toEqual(['plans']);
    expect(qk.assignableTeachers).toEqual(['assignable-teachers']);
  });

  it('cada dashboard de rol tiene su propia key; se invalidan por prefijo', () => {
    expect(qk.dashboard('admin')).toEqual(['dashboard', 'admin']);
    expect(qk.dashboard('teacher')).toEqual(['dashboard', 'teacher']);
    expect(qk.dashboard('student')).toEqual(['dashboard', 'student']);
    // Las tres keys son distintas (no comparten cache → no cruzan queryFn).
    expect(qk.dashboard('admin')).not.toEqual(qk.dashboard('student'));
    // El prefijo ['dashboard'] hace match con las tres en TanStack.
    expect(qk.dashboardAll).toEqual(['dashboard']);
    expect(qk.dashboard('admin')[0]).toBe(qk.dashboardAll[0]);
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
    expect(qkRoot.dashboard).toBe(qk.dashboardAll[0]);
  });
});
