import { db } from './db.js';

// Estado del plan de un alumno para inscribirse, según el modelo flat-fee con
// ciclo por aniversario (mensual) y consumo por asistencia (clase suelta).
//   active        → tiene mensualidad pagada, vigente y no consumida
//   allowance     → nº máximo de CLASES DISTINTAS (null = ilimitado); solo si active
//   expiresAt     → fin del ciclo vigente (solo si active)
//   needsRenewal  → tuvo un plan pero ya no está activo (venció o usó su clase suelta)
export type PlanStatus = {
	active: boolean;
	allowance: number | null;
	expiresAt: Date | null;
	needsRenewal: boolean;
	isSingleClass: boolean; // plan de clase suelta (clase reservada al pagar)
};

export async function getPlanStatus(studentId: string): Promise<PlanStatus> {
	const now = new Date();

	// Mensualidad activa: pagada y vigente (mensual: dentro del ciclo; clase
	// suelta: el día de la sesión aún no terminó).
	const active = await db.monthlySubscription.findFirst({
		where: {
			studentId,
			isPaid: true,
			expiresAt: { gt: now },
		},
		orderBy: { paidAt: 'desc' },
		select: {
			expiresAt: true,
			plan: { select: { classesPerWeek: true, isSingleClass: true } },
		},
	});

	if (active?.expiresAt) {
		const allowance = active.plan.isSingleClass
			? 1
			: active.plan.classesPerWeek === 0
				? null // ilimitado
				: active.plan.classesPerWeek;
		return {
			active: true,
			allowance,
			expiresAt: active.expiresAt,
			needsRenewal: false,
			isSingleClass: active.plan.isSingleClass,
		};
	}

	// Sin plan activo: ¿alguna vez pagó? → debe renovar (venció o usó su clase).
	const hadPlan = await db.monthlySubscription.count({
		where: { studentId, isPaid: true },
	});
	return {
		active: false,
		allowance: 0,
		expiresAt: null,
		needsRenewal: hadPlan > 0,
		isSingleClass: false,
	};
}
