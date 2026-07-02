import { describe, expect, it } from 'vitest';

import { canAccess, isAdmin, isAdminOrTeacher, isStudent, ROLE_SCREEN_ACCESS } from './roles';

describe('roles', () => {
  it('isAdmin / isAdminOrTeacher / isStudent', () => {
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('TEACHER')).toBe(false);
    expect(isAdminOrTeacher('TEACHER')).toBe(true);
    expect(isAdminOrTeacher('STUDENT')).toBe(false);
    expect(isStudent('STUDENT')).toBe(true);
  });

  it('canAccess respeta ROLE_SCREEN_ACCESS', () => {
    expect(canAccess('ADMIN', '/payouts')).toBe(true);
    expect(canAccess('TEACHER', '/payouts')).toBe(false);
    expect(canAccess('STUDENT', '/payouts')).toBe(false);
    expect(canAccess('STUDENT', '/my-classes')).toBe(true);
    expect(canAccess('ADMIN', '/my-classes')).toBe(false);
  });

  it('todos los roles pueden ver notificaciones e inicio', () => {
    for (const role of ['ADMIN', 'TEACHER', 'STUDENT'] as const) {
      expect(canAccess(role, '/')).toBe(true);
      expect(canAccess(role, '/notifications')).toBe(true);
    }
  });

  it('ruta desconocida no es accesible', () => {
    expect(canAccess('ADMIN', '/ruta-inexistente')).toBe(false);
  });

  it('ROLE_SCREEN_ACCESS no tiene duplicados por rol', () => {
    for (const screens of Object.values(ROLE_SCREEN_ACCESS)) {
      expect(new Set(screens).size).toBe(screens.length);
    }
  });
});
