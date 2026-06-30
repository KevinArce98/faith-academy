import { describe, expect, it } from 'vitest';

import { type PayoutInput, reducePayouts } from './payouts-core';

const teachers = [
	{ id: 't1', name: 'Marta' },
	{ id: 't2', name: 'Luis' },
];

const classes = [
	{ id: 'ballet', name: 'Ballet', teacherId: 't1' },
	{ id: 'jazz', name: 'Jazz', teacherId: 't2' },
	{ id: 'hiphop', name: 'HipHop', teacherId: 't1' },
];

function run(partial: Partial<PayoutInput>) {
	return reducePayouts({
		subscriptions: [],
		attendance: [],
		classes,
		teachers,
		...partial,
	});
}

const byTeacher = (r: ReturnType<typeof reducePayouts>, id: string) =>
	r.payouts.find((p) => p.teacherId === id);

describe('reducePayouts', () => {
	it('un alumno en una sola clase → todo a esa clase/profe', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 40000, isPaid: true }],
			attendance: [{ studentId: 's1', classId: 'ballet' }],
		});
		expect(r.totals.collected).toBe(40000);
		expect(r.totals.allocated).toBe(40000);
		expect(r.totals.unallocated).toBe(0);
		expect(r.payouts).toHaveLength(1);
		expect(byTeacher(r, 't1')).toMatchObject({
			teacherName: 'Marta',
			total: 40000,
		});
	});

	it('divide equitativo entre clases distintas (₡40.000 → Ballet+Jazz = ₡20k c/u)', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 40000, isPaid: true }],
			attendance: [
				{ studentId: 's1', classId: 'ballet' },
				{ studentId: 's1', classId: 'jazz' },
			],
		});
		expect(byTeacher(r, 't1')!.total).toBe(20000);
		expect(byTeacher(r, 't2')!.total).toBe(20000);
	});

	it('asistencias repetidas a la misma clase no cambian el reparto (cuenta clases distintas)', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 40000, isPaid: true }],
			attendance: [
				{ studentId: 's1', classId: 'ballet' },
				{ studentId: 's1', classId: 'ballet' },
				{ studentId: 's1', classId: 'jazz' },
			],
		});
		expect(byTeacher(r, 't1')!.total).toBe(20000);
		expect(byTeacher(r, 't2')!.total).toBe(20000);
	});

	it('mensualidad sin pagar va a pending, no se reparte', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 40000, isPaid: false }],
			attendance: [{ studentId: 's1', classId: 'ballet' }],
		});
		expect(r.totals.pending).toBe(40000);
		expect(r.totals.collected).toBe(0);
		expect(r.payouts).toHaveLength(0);
	});

	it('pagado pero sin asistencia → unallocated', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 30000, isPaid: true }],
			attendance: [],
		});
		expect(r.totals.collected).toBe(30000);
		expect(r.totals.unallocated).toBe(30000);
		expect(r.totals.allocated).toBe(0);
		expect(r.payouts).toHaveLength(0);
	});

	it('beca ₡0 pagada aporta 0', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 0, isPaid: true }],
			attendance: [{ studentId: 's1', classId: 'ballet' }],
		});
		expect(r.totals.collected).toBe(0);
		expect(byTeacher(r, 't1')?.total ?? 0).toBe(0);
	});

	it('profe con varias clases suma; varios alumnos', () => {
		const r = run({
			subscriptions: [
				{ studentId: 's1', amount: 40000, isPaid: true }, // ballet + jazz
				{ studentId: 's2', amount: 30000, isPaid: true }, // ballet + hiphop (ambas t1)
			],
			attendance: [
				{ studentId: 's1', classId: 'ballet' },
				{ studentId: 's1', classId: 'jazz' },
				{ studentId: 's2', classId: 'ballet' },
				{ studentId: 's2', classId: 'hiphop' },
			],
		});
		// t1: ballet(20k de s1) + ballet(15k de s2) + hiphop(15k) = 50k ; t2: jazz 20k
		expect(byTeacher(r, 't1')!.total).toBe(50000);
		expect(byTeacher(r, 't2')!.total).toBe(20000);
		expect(r.totals.collected).toBe(70000);
		expect(r.totals.allocated).toBe(70000);
	});

	it('classStats: ingreso y nº de alumnos por clase', () => {
		const r = run({
			subscriptions: [
				{ studentId: 's1', amount: 40000, isPaid: true },
				{ studentId: 's2', amount: 40000, isPaid: true },
			],
			attendance: [
				{ studentId: 's1', classId: 'ballet' },
				{ studentId: 's2', classId: 'ballet' },
			],
		});
		const ballet = r.classStats.find((c) => c.classId === 'ballet')!;
		expect(ballet.revenue).toBe(80000);
		expect(ballet.students).toBe(2);
		expect(ballet.teacherName).toBe('Marta');
	});

	it('redondeo a 2 decimales (₡10.000 entre 3 clases)', () => {
		const r = run({
			subscriptions: [{ studentId: 's1', amount: 10000, isPaid: true }],
			attendance: [
				{ studentId: 's1', classId: 'ballet' },
				{ studentId: 's1', classId: 'jazz' },
				{ studentId: 's1', classId: 'hiphop' },
			],
		});
		expect(r.classStats.find((c) => c.classId === 'ballet')!.revenue).toBe(
			3333.33,
		);
	});

	it('sin datos → todo en cero', () => {
		const r = run({});
		expect(r.totals).toEqual({
			collected: 0,
			pending: 0,
			allocated: 0,
			unallocated: 0,
		});
		expect(r.payouts).toHaveLength(0);
		expect(r.classStats).toHaveLength(0);
	});
});
